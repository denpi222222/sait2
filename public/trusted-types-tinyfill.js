if (typeof window !== 'undefined' && typeof window.trustedTypes === 'undefined') {
  window.trustedTypes = { createPolicy: (name, rules) => rules };
} 