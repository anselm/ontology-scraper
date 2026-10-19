<script>import { rpc } from "../lib/api.js"; let s = $state(null); rpc("stats").then((r) => (s = r));</script>
<article class="prose-notes">
<h1 class="!mt-0 text-xl font-semibold">About</h1>
<p>A machine reads the news and recent essays on a schedule and finds the real things they are about: a ship, a strait, a minister, a river, a storm. For each thing it decides what kind of thing it is and what parts a thing of that kind has. Then it shows all of this: the things on a map over time, the relations between them as a graph, and the vocabulary of kinds and parts it has built so far.</p>
<p>The vocabulary is expected to be wrong at first. The point of the tool is to watch it get refactored as material arrives: kinds split and merge, labels that turn out to be roles are demoted, and new parts are proposed from the facts the texts keep stating. The notes page records those changes in plain words.</p>
<h2>How it is built</h2>
<ul>
<li><strong>Entities, not classes.</strong> Each thing is a bare id decorated with components (a name, a place, a lifespan, an office held). Kinds are scored claims that can be revised, never fixed facts.</li>
<li><strong>Five fixed top kinds</strong>: agent, place, thing, event, work. Everything under them is a soft prototype proposed from the texts.</li>
<li><strong>Every claim has a source.</strong> A thing's page lists the sentences that mention it with links to the articles. Article bodies are not republished.</li>
<li><strong>Time is kept twice</strong>: when a fact was true, and when a source said so. Conflicts between sources stay visible.</li>
<li><strong>Places are a point and a radius</strong>, crude on purpose, taken from a gazetteer when a confident match exists and from the reader's estimate otherwise.</li>
</ul>
<h2>Guiding light</h2>
<div class="mt-2 flex gap-4 items-start">
<a href="https://www.ontologypipeline.com/" class="shrink-0"><img src="/ontology-pipeline-cover.jpg" alt="Cover of Ontology Pipeline by Jessica Talisman" width="108" height="140" class="rounded-sm border border-line" /></a>
<div>
<p class="!mt-0"><strong>Jessica Talisman, <em>Ontology Pipeline: A framework for building knowledge infrastructures</em></strong> (Technics Publications). The book lays out the sequence this project follows, one stage feeding the next: controlled vocabulary, metadata, taxonomy, thesaurus, ontology, knowledge graph. Here the extractor's named things and prototypes are the controlled vocabulary, components are the metadata schema, the induced hierarchy of kinds is the taxonomy with its alternative labels as the thesaurus, the components with their fields are the ontology, and the map and graph are the knowledge graph. Where this project departs from the book, the departure is noted in the devlog.</p>
<p class="text-sm">Book and author: <a href="https://www.ontologypipeline.com/">ontologypipeline.com</a> · publisher: <a href="https://technicspub.com/ontology-pipeline">technicspub.com</a>. Cover image from the publisher's page.</p>
</div>
</div>
{#if s}<p class="num text-xs text-dim">{s.instances} things · {s.prototypes} prototypes · {s.relations} relations · {s.claims} stated facts · from {s.content} documents across {s.sources} sources</p>{/if}
<p>Code and working log: <a href="https://github.com/anselm/ontology-scraper">github.com/anselm/ontology-scraper</a>. Entities are machine-extracted and contain errors.</p>
</article>
