# 2026-10-19: the ontology monster

Anselm: "give ontology.monster a monster icon - make it different from the other monsters such as
attest.monster ... i am building a stable of monsters for fun. i need an icon per monster because i am
going to showcase all the monsters together at some point."

Checked the others first: attest.monster is a round, horned, two-eyed blue creature holding a cat's
cradle (`attest/public/favicon.svg`); matchmaker.monster's mark is two overlapping circles, not a
creature. Ours is a squat, wide, teal (#2f7a6b, the brand colour) creature with three eyes that each
look somewhere else, one tooth, and a three-node graph worn as a crown: it looks at things from several
angles and sorts them into kinds. Drawn by hand as `public/mark.svg` (200x200 viewBox, reads at 16px;
the old mark was an abstract node diagram), with `icon-192.png`, `icon-512.png` and
`apple-touch-icon.png` rendered from it by ImageMagick. `index.html` links the SVG as favicon and the
PNG for Apple; the header in `App.svelte` already used `/mark.svg`.

Harness memory `stable-of-monsters` records the stable and the rule that each monster differs.
