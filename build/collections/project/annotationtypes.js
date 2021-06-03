import config from "../../models/config";
import Base from "../base";
import AnnotationType from "../../models/project/annotationtype";
class AnnotationTypes extends Base {
    url = () => {
        return config.get('restUrl') + "annotationtypes";
    };
    comparator = (annotationType) => {
        return annotationType.get('title').toLowerCase();
    };
}
;
AnnotationTypes.prototype.model = AnnotationType;
