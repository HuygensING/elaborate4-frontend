/// <reference types="jquery" />
declare const _default: {
    closest: (el: any, selector: any) => any;
    generateID: (length: any) => any;
    deepCopy: (object: any) => any;
    timeoutWithReset: (ms: any, cb: any, onResetFn?: any) => number;
    highlighter: (args?: any) => {
        on: (args: any) => any;
        off: () => JQuery<any>;
    };
    position: (el: any, parent: any) => {
        left: any;
        top: any;
    };
    boundingBox: (el: any) => any;
    isDescendant: (parent: any, child: any) => boolean;
    removeFromArray: (arr: any, item: any) => any;
    escapeRegExp: (str: any) => any;
    flattenObject: (obj: any, into?: any, prefix?: any) => any;
    compareJSON: (current: any, changed: any) => any;
    isObjectLiteral: (obj: any) => boolean;
    getScrollPercentage: (el: any) => {
        top: any;
        left: any;
    };
    setScrollPercentage: (el: any, percentages: any) => number;
    checkCheckboxes: (selector?: string, checked?: boolean, baseEl?: Document) => any;
    setCursorToEnd: (textEl: any, windowEl: any) => any;
    arraySum: (arr: any) => any;
    getAspectRatio: (originalWidth: any, originalHeight: any, boxWidth: any, boxHeight: any) => number;
    hasScrollBar: (el: any) => boolean;
    hasXScrollBar: (el: any) => boolean;
    hasYScrollBar: (el: any) => boolean;
};
export default _default;
//# sourceMappingURL=general.d.ts.map