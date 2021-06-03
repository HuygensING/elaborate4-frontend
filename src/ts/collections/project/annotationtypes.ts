import config from "../../models/config"
import Base from "../base"
import  AnnotationType from "../../models/project/annotationtype"

export default class AnnotationTypes extends Base {
  model = AnnotationType

  url = () => {
    return config.get('restUrl') + "annotationtypes";
  }

  comparator = (annotationType) => {
    return annotationType.get('title').toLowerCase();
  }
};
