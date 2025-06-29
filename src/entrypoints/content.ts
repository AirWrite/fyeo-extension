import "@webcomponents/custom-elements";
import Redacted from "@/lib/Redacted.svelte";
import { createRawSnippet, mount } from "svelte";

function* walkTree(walker: TreeWalker) {
    while (true) {
        let node = walker.nextNode();
        if (node) {
            yield node;
        } else {
            break;
        }
    }
}

function isDescendant(node: Node, test: (node: HTMLElement) => boolean) {
    let current = node.parentElement;
    while (current) {
        if (test(current)) {
            return true;
        }
        current = current.parentElement;
    }
    return false;
}

const PATTERNS = {
    stripe: /sk_live_[a-zA-Z0-9]{24}/g,
    aws: /AKIA[0-9A-Z]{16}/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g,
};

function detectSensitiveData(text: string, pii?: boolean) {
    let match;
    let matches = [];

    const stripeRegex = new RegExp(PATTERNS.stripe.source, "g");
    while ((match = stripeRegex.exec(text)) !== null) {
        matches.push({
            isPii: false,
            start: match.index,
            end: match.index + match[0].length,
            value: match[0],
        });
        // matches.push(...stripeMatches.map(match => ({ type: 'stripe', value: match })));
    }

    const awsRegex = new RegExp(PATTERNS.aws.source, "g");
    while ((match = awsRegex.exec(text)) !== null) {
        matches.push({
            isPii: false,
            start: match.index,
            end: match.index + match[0].length,
            value: match[0],
        });
        // matches.push(...stripeMatches.map(match => ({ type: 'stripe', value: match })));
    }

    // Check PII only if enabled
    if (pii) {
        const emailRegex = new RegExp(PATTERNS.email.source, "g");
        while ((match = emailRegex.exec(text)) !== null) {
            matches.push({
                isPii: true,
                start: match.index,
                end: match.index + match[0].length,
                value: match[0],
            });
            // matches.push(...emailMatches.map(match => ({ type: 'email', value: match })));
        }

        const ssnRegex = new RegExp(PATTERNS.ssn.source, "g");
        while ((match = ssnRegex.exec(text)) !== null) {
            matches.push({
                isPii: true,
                start: match.index,
                end: match.index + match[0].length,
                value: match[0],
            });
            // matches.push(...ssnMatches.map(match => ({ type: 'ssn', value: match })));
        }
    }

    return matches;
}

function getTextNodes() {
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function (node) {
                const parent = node.parentNode;
                console.log(parent);
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (
                    parent &&
                    (parent.nodeName === "SCRIPT" ||
                        parent.nodeName === "STYLE")
                ) {
                    return NodeFilter.FILTER_REJECT;
                }

                if (parent && parent?.nodeType === parent?.ELEMENT_NODE) {
                    const parentElement = parent as Element;
                    if (parentElement.hasAttribute("x-fyeo-redact")) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (
                        isDescendant(parent, (element) =>
                            element.hasAttribute("x-fyeo-redact"),
                        )
                    ) {
                        return NodeFilter.FILTER_REJECT;
                    }
                }
                return node.textContent
                    ? node.textContent.trim()
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_REJECT
                    : NodeFilter.FILTER_REJECT;
            },
        },
    );
    return walkTree(walker).toArray();
}

export default defineContentScript({
    matches: ["<all_urls>"],
    runAt: "document_start",
    async main(ctx) {


        let config = {
            enabled: true,
            pii: true,
        };

        let redacted = new Set<{
            isPii: boolean;
            setHide: (render: boolean) => void;
        }>();

        function scan() {
            if (!config.enabled) return;
            getTextNodes().forEach((textNode) => {
                const clone = textNode.cloneNode();
                textNode.textContent = ""
                const originalText = clone.textContent || "";
                const matches = detectSensitiveData(
                    originalText,
                    config.pii,
                );
                const fragment = document.createDocumentFragment();
                let lastEnd = 0;

                if(matches.length === 0) {
                    textNode.textContent = originalText
                    return
                }

                matches.sort((a, b) => a.start - b.start);
                matches.forEach((match) => {
                    if (match.start > lastEnd) {
                        fragment.appendChild(document.createTextNode(originalText.slice(lastEnd, match.start)));
                    }

                    const span = document.createElement("span");
                    span.setAttribute("x-fyeo-redact", "");
                    let { setHide } = mount(Redacted, {
                        target: span,
                        props: {
                            children: createRawSnippet(() => {
                                return {
                                    render: () => "<span></span>",
                                    setup: (element) => {
                                        element.appendChild(document.createTextNode(match.value));
                                    },
                                };
                            }),
                            length: match.value.length
                        },
                    });

                    fragment.appendChild(span)

                    console.log(redacted);
                    redacted.add({ isPii: match.isPii, setHide });
                });
                textNode.parentNode!.replaceChild(fragment, textNode);
            });
        }

        let observer: MutationObserver;
        let mutationTimeout: number;

        function setupMutationObserver() {
            observer = new MutationObserver((mutations) => {
                let hasNewText = false;

                // Fast check for relevant mutations
                for (const mutation of mutations) {
                    if (
                        mutation.type === "childList" &&
                        mutation.addedNodes.length > 0
                    ) {
                        for (const node of mutation.addedNodes) {
                            if (
                                node.nodeType === Node.TEXT_NODE ||
                                (node.nodeType === Node.ELEMENT_NODE &&
                                    node.textContent!.trim())
                            ) {
                                hasNewText = true;
                                break;
                            }
                        }
                        if (hasNewText) break;
                    }
                }

                if (hasNewText) {
                    // Immediate processing for better responsiveness
                    clearTimeout(mutationTimeout);
                    mutationTimeout = ctx.setTimeout(() => {
                        requestAnimationFrame(scan);
                    }, 50); // Reduced from 500ms to 50ms
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }

        browser.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === "sync") {
                if (changes.enabled) {
                    config.enabled = changes.enabled.newValue;
                }

                if (changes.pii) {
                    config.pii = changes.pii.newValue;
                }

                redacted.forEach((match) => {
                    if (match.isPii) {
                        match.setHide(config.enabled && config.pii);
                    } else {
                        match.setHide(config.enabled);
                    }
                });
                console.log("[fyeo] config updated");
            }
        });

        function loadConfig() {
            const { promise, resolve } = Promise.withResolvers();
            browser.storage.sync.get(["enabled", "pii"], (result) => {
                config.enabled =
                    result.enabled !== undefined ? result.enabled : true;
                config.pii = result.pii !== undefined ? result.pii : true;
                resolve(config);
            });
            return promise;
        }

        async function init() {
            try {
                await loadConfig();
                ctx.requestAnimationFrame(scan);
                setupMutationObserver();
            } catch {
                console.error("[fyeo] failed to initialize");
            }
        }

        requestAnimationFrame(init);
    },
});
