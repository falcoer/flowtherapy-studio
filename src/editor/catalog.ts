import agendaJSON from "../../catalog/templates/agenda.json" with { type: "json" };
import concertIllustratedJSON from "../../catalog/templates/concert-illustrated.json" with { type: "json" };
import square from "../../catalog/formats/square.json" with { type: "json" };
import portrait from "../../catalog/formats/portrait.json" with { type: "json" };
import story from "../../catalog/formats/story.json" with { type: "json" };
import a4 from "../../catalog/formats/a4.json" with { type: "json" };
import a3 from "../../catalog/formats/a3.json" with { type: "json" };
import type { Template, Format } from "../domain/model.js";
export const formats = [square, portrait, story, a4, a3] as Format[];
export const agenda = agendaJSON as Template;
export const concertIllustrated = concertIllustratedJSON as Template;

import editorialNote from "../../catalog/templates/editorial-note.json" with { type: "json" };
export const templates = [agenda, concertIllustrated, editorialNote as Template];
