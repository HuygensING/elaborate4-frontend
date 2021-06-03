import Base from "../base";
export default class Longpress extends Base {
    options: any;
    timer: any;
    lastKeyCode: any;
    keyDown: any;
    iframe: any;
    iframeBody: any;
    editorBody: any;
    longKeyDown: any;
    rangeManager: any;
    initialize(options?: any): any;
    render(pressedChar?: any): any;
    onKeydown(e: any): any;
    onKeyup(e: any): any;
    onClick(e: any): any;
    destroy(): this;
    show(list: any): any;
    hide(): any;
    replaceChar(chr: any): any;
    resetFocus(): any;
}
//# sourceMappingURL=main.d.ts.map