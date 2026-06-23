import { useEffect, useRef } from "react";
import { useI18n } from "../i18n/i18nContext";

const textOriginals = new WeakMap();
const attributeOriginals = new WeakMap();
const translatableAttributes = ["placeholder", "aria-label", "title"];

function preserveOuterWhitespace(originalValue, translatedValue) {
  const leading = originalValue.match(/^\s*/)?.[0] || "";
  const trailing = originalValue.match(/\s*$/)?.[0] || "";
  return `${leading}${translatedValue}${trailing}`;
}

export default function TranslatedStaticTextScope({ translations, children }) {
  const scopeRef = useRef(null);
  const { language, t } = useI18n();

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) {
      return undefined;
    }

    const translate = () => {
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let textNode = walker.nextNode();

      while (textNode) {
        textNodes.push(textNode);
        textNode = walker.nextNode();
      }

      textNodes.forEach((node) => {
        const original = textOriginals.get(node) || node.nodeValue;
        textOriginals.set(node, original);
        const key = translations.text?.[original.trim()];

        if (key) {
          const translatedText = preserveOuterWhitespace(original, t(key));
          if (node.nodeValue !== translatedText) {
            node.nodeValue = translatedText;
          }
        }
      });

      scope.querySelectorAll("*").forEach((element) => {
        translatableAttributes.forEach((attribute) => {
          if (!element.hasAttribute(attribute)) {
            return;
          }

          const elementOriginals = attributeOriginals.get(element) || {};
          if (!elementOriginals[attribute]) {
            elementOriginals[attribute] = element.getAttribute(attribute);
            attributeOriginals.set(element, elementOriginals);
          }

          const original = elementOriginals[attribute];
          const key = translations.attributes?.[attribute]?.[original.trim()];

          if (key) {
            const translatedAttribute = t(key);
            if (element.getAttribute(attribute) !== translatedAttribute) {
              element.setAttribute(attribute, translatedAttribute);
            }
          }
        });
      });
    };

    translate();

    const observer = new MutationObserver(translate);
    observer.observe(scope, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatableAttributes,
    });

    return () => observer.disconnect();
  }, [language, t, translations]);

  return <div ref={scopeRef}>{children}</div>;
}
