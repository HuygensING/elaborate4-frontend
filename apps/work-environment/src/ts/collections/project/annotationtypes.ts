import config from "../../models/config"
import { BaseCollection } from "@elaborate4-frontend/hilib"
import AnnotationType from "../../models/project/annotationtype"
import { model } from "@elaborate4-frontend/hilib";

@model(AnnotationType)
export default class AnnotationTypes extends BaseCollection {
  url = () => {
    return config.get('restUrl') + "annotationtypes";
  }

  comparator = (annotationType) => {
    return annotationType.get('title')?.toLowerCase();
  }
}
