export const addStylesheet = (href: string): void => {
    // 既に同じhrefを持つlinkタグが存在するか確認
    const existingLink = document.querySelector(`link[rel="stylesheet"][href="${href}"]`);
    if (!existingLink) {
        const link = document.createElement('link') as HTMLLinkElement;
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }
};
