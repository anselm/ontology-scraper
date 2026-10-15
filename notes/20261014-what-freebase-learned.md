# What Freebase learned about curating the world

This project is not the first machine to try to hold the world's things in one graph. The most instructive attempt ran for nine years, from 2007 to 2016, and its people wrote down what happened. This note is a short history of it and of what we take from it. Every date and quotation below is from a source listed at the end; where I could not find a source, I say so.

## A Wikipedia for structured data

In March 2007 a San Francisco company called Metaweb opened Freebase to the public. Tim O'Reilly described the bet at the time: unlike the W3C approach to the semantic web, "which starts with controlled ontologies," Metaweb "adopts a folksonomy approach, in which people can add new categories (much like tags), in a messy sprawl of potentially overlapping assertions." Anyone could add a thing, a type, or a property. Data was seeded from Wikipedia and MusicBrainz and then edited by hand.

The 2008 paper that described the system, by Kurt Bollacker, Colin Evans, Praveen Paritosh, Tim Sturge and Jamie Taylor, put it plainly: "The data in Freebase is collaboratively created, structured, and maintained." At that point it held more than 125 million tuples, more than 4,000 types and more than 7,000 properties.

The sprawl had a gate. Wikipedia's account of Freebase says a user-created type did not enter the shared "commons" until a Metaweb employee promoted it, and that users could not change each other's types, because a schema change could break every query written against it. That sentence in Wikipedia carries no citation, so treat it as the recollection of the people who wrote it rather than a documented policy.

Google bought Metaweb in July 2010. In May 2012 Google announced the Knowledge Graph, "things, not strings," with more than 500 million objects and 3.5 billion facts, and named Freebase, Wikipedia and the CIA World Factbook among its public roots.

## The hand-off to Wikidata

In December 2014 the Freebase team announced it would close the project and move its data to Wikidata, the Wikimedia Foundation's knowledge base, which had launched in October 2012. The announcement said the team "believe strongly in a robust community-driven effort to collect and curate structured knowledge about the world," and thought that goal was now best served by supporting Wikidata. Freebase went read-only on 31 March 2015 holding more than 3 billion facts about almost 50 million entities, and closed on 2 May 2016.

The paper that describes the migration, by Thomas Pellissier Tanon, Denny Vrandečić, Sebastian Schaffert, Thomas Steiner and Lydia Pintscher, is the most useful document in this story, because it is a frank account of what happens when a large machine-maintained graph meets a community of human editors. Its findings:

- **The hard part was cultural, not structural.** "Even more demanding was the cultural difference between the two involved communities," with "subtly different goals and understandings of their tasks, and different requirements regarding their data."
- **The editors refused a bulk import.** Freebase's quality "was not sufficient for a direct import." Boston had the type person; a small French town had an ISO country code. A fast automatic upload "would certainly have endangered the sense of ownership of the Wikidata community for its data."
- **More data means more maintenance.** Data "needs to be updated as the world changes, but also kept free of vandalism." Ingesting Freebase whole "would have meant overwhelming the existing editors and thereby harming the project in the long run." Growth in data has to go with growth in editors or better tools for them.
- **So they built a proposal queue.** The Primary Sources Tool shows a Freebase statement beside the Wikidata item it concerns and lets an editor accept or reject it. In a short time it produced more than 14 million new Wikidata statements, each one placed by a person.
- **Facts versus claims.** Freebase stored facts. Wikidata statements "do not aim to encode true facts, but claims from different sources, which can also contradict each other," so that a border dispute can be recorded from both sides.
- **Even the machine-made links needed people.** Two automatic mappings between Freebase topics and Wikidata items disagreed in 6,000 places; "human curation is required before import anyway."

## Jamie Taylor

One person runs through the whole story. Jamie Taylor was Metaweb's "Minister of Information," in his own bio's words, "helping organize data in Freebase and evangelizing semantic representation to web developers." He co-wrote the 2008 Freebase paper and, with Toby Segaran and Colin Evans, the O'Reilly book Programming the Semantic Web (2009). After the acquisition he went on to manage the Schema Team for Google's Knowledge Graph, whose job he describes as "extending KG's underlying semantic representation, growing coverage of the ontology and enforcing semantic policy." He is also a co-author of the 2019 article "Industry-scale Knowledge Graphs: Lessons and Challenges," in which people from Microsoft, Google, Facebook, eBay and IBM compare notes. I could not read that article past its abstract from here, so I do not summarise it.

Two of his talk abstracts say where his thinking went.

At the International Semantic Web Conference in 2017 his keynote was called "Applied semantics: beyond the catalog." Knowledge graphs, he wrote, began as catalogs that "gave identifiers to things, assigned them categories and asserted facts about them," and the catalogs proved useful. But they are "semantically limited. The connections entities participate in are sparse, requiring human understanding when decoding relationships and categorical membership. Entities are frequently identified by lucky linguistic matches rather than constraints against semantic intent." For machines to understand the world, "knowledge graphs need to grow beyond catalogs, encoding things which stretch the notion of 'fact' and act as semantic APIs for the real world."

At the Automated Knowledge Base Construction conference in 2020 he spoke on "A long view on Identity." The Knowledge Graph "is a durable collection of entities," and its value comes from accumulating what is learned about each one over years. For that to work "the entities must be easily distinguishable from one another and stable in what they represent. But how should the boundaries between each entity be determined? Moreover, what is the right granularity of categories and relations that should be applied to these entities? There are many options for how the world could be cleaved ontologically, but experience with a large stable knowledge graph has shown that pragmatically some criteria may matter more than others. And yet, in some cases, the decision might not be as important as we thought."

A blog post by Diffbot, a competitor of Google's, quotes him telling an automated knowledge base construction audience that his world "is far from automated" and that "in terms of knowledge base construction, the world I work in is really one of a watchmaker. A precision scientist." The post gives no date or recording, so I could not check the quotation; I include it because it is the one place I found him speaking directly about hand curation, and I mark it as unverified.

What I did not find: an interview or essay in which he sets out his view of human curation at scale in his own words. The recording of the 2017 keynote (about an hour, on VideoLectures) and the 2020 talk are the places to look next.

## What this project takes from it

- **Claims, not facts.** Every relation and kind here is a claim with a source and a time, and sources may disagree. That is Wikidata's model, and the migration paper's reason for it.
- **Machines propose, people promote.** Freebase had a commons gate; the migration used a proposal queue. Here the machine's merges, hierarchy and new components are recorded as proposals. The queue to review them by hand is the next thing to build.
- **Identity first.** Taylor's test is that an entity be distinguishable and stable. Each thing here has an arbitrary id, its names are evidence, and a merge is a recorded decision that can be undone.
- **Granularity is pragmatic.** Which kinds exist below the five top kinds is decided by what the evidence supports and can be revised. His remark that some such decisions "might not be as important as we thought" is a comfort.
- **Beyond the catalog.** The extractor records not just that two things are related but the predicate, the stance and the quote, because a catalog of names and categories is where the earlier graphs stalled.
- **Grow with the curators.** The migration paper's warning about overwhelming editors is why analysis here runs on a daily budget and why outside contributions arrive as proposals rather than as writes.

## Sources

- Michael Arrington, TechCrunch, 9 March 2007, quoting Tim O'Reilly on Freebase: https://techcrunch.com/?p=5175
- Kurt Bollacker, Colin Evans, Praveen Paritosh, Tim Sturge, Jamie Taylor, "Freebase: a collaboratively created graph database for structuring human knowledge," SIGMOD 2008: https://research.google/pubs/freebase-a-collaboratively-created-graph-database-for-structuring-human-knowledge/
- Toby Segaran, Colin Evans, Jamie Taylor, Programming the Semantic Web, O'Reilly, July 2009.
- Jack Menzel, "Deeper understanding with Metaweb," Google blog, 16 July 2010: http://googleblog.blogspot.com/2010/07/deeper-understanding-with-metaweb.html
- Amit Singhal, "Introducing the Knowledge Graph: things, not strings," Google blog, 16 May 2012: https://blog.google/products/search/introducing-knowledge-graph-things-not/
- Freebase team announcement, 16 December 2014, as reported by Chris Crum, WebProNews, 17 December 2014: https://www.webpronews.com/google-is-shutting-down-knowledge-graph-source-freebase/
- Thomas Pellissier Tanon, Denny Vrandečić, Sebastian Schaffert, Thomas Steiner, Lydia Pintscher, "From Freebase to Wikidata: The Great Migration," WWW 2016: https://archives.iw3c2.org/www2016/WWW2016-Proceedings/proceedings/p1419.pdf
- Jamie Taylor, "Applied semantics: beyond the catalog," ISWC 2017 keynote abstract and bio: https://iswc2017.semanticweb.org/program/keynotes/keynote-taylor/
- Jamie Taylor, "A long view on Identity," AKBC 2020 abstract and bio: https://www.akbc.ws/2020/virtual/speaker_jtaylor.html
- Natasha Noy, Yuqing Gao, Anshu Jain, Anant Narayanan, Alan Patterson, Jamie Taylor, "Industry-scale Knowledge Graphs: Lessons and Challenges," Communications of the ACM 62(8), 2019: https://research.google/pubs/industry-scale-knowledge-graphs-lessons-and-challenges/
- Diffbot blog, "Benchmarking: Diffbot Knowledge Graph Versus Google Knowledge Graph," undated: https://blog.diffbot.com/benchmarking-diffbot-knowledge-graph-versus-google-knowledge-graph/
- Wikipedia, "Freebase (dataset)": https://en.wikipedia.org/wiki/Freebase_(dataset)
