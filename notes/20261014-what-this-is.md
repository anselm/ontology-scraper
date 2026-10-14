# What this is, and why it starts wrong

A machine reads the news and tries to recover the vocabulary people use to talk about the world: the kinds of things (a ship, a strait, a government) and the parts those kinds share (a name, a place, a span of time, an office held). The news is a stream of instances of those kinds, so the vocabulary can be learned from it, and corrected by it.

The design accepts three things up front.

**Categories fail.** Every partition of the world meets its platypus: the thing that fits two boxes or none. So the kinds here are soft. Five top kinds are fixed (agent, place, thing, event, work) because every serious attempt at a world vocabulary agrees on roughly that split. Everything below them is a proposal, scored, with its evidence attached, and can be merged, split or demoted later.

**Names are not identity.** Two different people, towns or ships can share a name. Each thing here gets an arbitrary id; its names are evidence attached to it. When the machine decides two records are the same thing, that decision is itself recorded so it can be undone.

**Sources disagree.** A fact is stored with when it was true and when a source said so. The page for a thing shows what the sources said, with links, rather than one smoothed answer.

The first day's reading came from public broadcasters, UN and government feeds, science journals and a few specialist outlets. Sources whose terms forbid machine reading are listed but not read.
