import { model } from "@elaborate4-frontend/hilib"
import Backbone from "backbone"
import { Annotation } from "../models/annotation"

@model(Annotation)
export class Annotations extends Backbone.Collection {}
