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

export const removeStylesheet = (href: string): void => {
    // 指定されたhrefを持つlinkタグを探す
    const existingLink = document.querySelector(`link[rel="stylesheet"][href="${href}"]`);
    if (existingLink) {
        document.head.removeChild(existingLink);
    }
};

// utils.ts
export const fetchData = async <T>(url: string, options?: RequestInit): Promise<T> => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
};
