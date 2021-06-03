import '../../utils/jquery.mixin';
import Base from "../base";
export default class SuperTinyEditor extends Base {
    options: any;
    autoScroll: any;
    $currentHeader: any;
    iframeDocument: any;
    iframeBody: any;
    longpress: any;
    initialize(options?: any): this;
    render(): this;
    renderControls(): any;
    renderIframe(): any;
    events(): {
        'click .ste-control': string;
        'click .ste-control-diacritics ul.diacritics li': string;
        'click .ste-control-wordwrap': string;
        'click .ste-button': string;
    };
    buttonClicked(ev: any): this;
    controlClicked(ev: any): this;
    wordwrapClicked(ev: any): this;
    diacriticClicked(ev: any): this;
    destroy(): this;
    saveHTMLToModel(): import("backbone").Model<any, import("backbone").ModelSetOptions, {}>;
    triggerScroll(): this;
    setModel(model: any): any;
    setInnerHTML(html: any): any;
    setIframeHeight(height: any): string;
    setIframeWidth(width: any): string;
    setFocus(): any;
    setScrollPercentage(percentages: any): number;
}
//# sourceMappingURL=supertinyeditor.d.ts.map