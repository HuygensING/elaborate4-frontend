declare const DOM: (el: any) => {
    el: any;
    q: (query: any) => any;
    find: (query: any) => any;
    findAll: (query: any) => any;
    html: (html: any) => any;
    hide: () => any;
    show: (displayType?: string) => any;
    toggle: (displayType: string, show: any) => any;
    closest: (selector: any) => any;
    append: (childEl: any) => any;
    prepend: (childEl: any) => any;
    position: (parent?: HTMLElement) => {
        left: any;
        top: any;
    };
    hasDescendant: (child: any) => boolean;
    boundingBox: () => any;
    insertAfter: (referenceElement: any) => any;
    highlightUntil: (endNode: any, options?: any) => {
        on: () => any;
        off: () => any;
    };
    hasClass: (name: any) => boolean;
    addClass: (name: any) => string;
    removeClass: (name: any) => any;
    toggleClass: (name: any) => any;
    inViewport: (parent: any) => boolean;
    createTreeWalker: (endNode: any, nodeFilterConstant: any) => TreeWalker;
};
export default DOM;
//# sourceMappingURL=dom.d.ts.map