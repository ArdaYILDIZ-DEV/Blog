---
title: An Obsidian vault built for Pi
description: How the folders, templates, and Pi agent fit together.
tags: [Obsidian, Pi]
translationKey: vault-overview
---

As a vault grows, it gets harder to remember where each note belongs. This one uses folders and frontmatter to make notes easier to place and find again. Pi works within the same setup: `AGENTS.md` sets its rules, and `README.md` explains the structure and tools for people.

## Where notes go

The folders separate notes by purpose. `00-gelen-kutusu/` is for items that still need sorting. Daily notes live in `01-gunluk/` as `YYYY-MM-DD.md` files. Projects with an intended endpoint go in `02-projeler/`; ongoing responsibilities go in `03-alanlar/`. `04-kaynaklar/` holds references and ideas, while `06-kisiler/` is for people notes.

Finished, abandoned, or outdated notes can be moved to `05-arsiv/`. Archiving means moving a note, not deleting it. `90-sablonlar/` holds note templates, and `91-ekler/` is for attachments such as images and PDFs. Each folder's `_index.md` explains its role. Filenames use lowercase kebab-case and avoid Turkish characters, though headings inside notes can use them. Daily notes follow the date pattern; other files get short names based on their subject. 
## What a note records

Frontmatter stores its type, an `etiketler` list, and fields such as `olgunluk` and `eylem-durumu`. The templates leave the tag list empty, and the schema doesn't define a fixed vocabulary. `olgunluk` describes how developed a note is; `eylem-durumu` tracks the state of its work. Those are separate things, so a project note can be early-stage and active at the same time. Project notes can also include a target date in `hedef-tarih`.

`90-sablonlar/` has starters for daily, project, area, source, idea, and person notes. `frontmatter-semasi.md` explains the fields and how to use them. Together, the templates and schema give new notes a shared structure without making you set up each one from scratch.

Relationships between notes also live in frontmatter. `ev` can point to a note's main context, while `ilgili` is limited to a few direct connections. The same links aren't repeated in a separate section in the note body. The vault uses Obsidian-style wikilinks, which its search and integrity tools can follow.

## How Pi works here

Pi treats the vault like a codebase made of text files. At the start of a session, its guidelines tell it to read the core context, the previous-session note, and open work. Before creating a note, it searches for existing material and picks a suitable template.

The rules also keep changes narrow. Pi checks relevant files, preserves what's already there, and changes only what the task needs. If an ambiguity could affect the result, it asks. After a note changes, tools under `scripts/` check links, attachments, filenames, and frontmatter. Search and the task dashboard help find things without a manually maintained index.

Obsidian's settings enable built-in features such as Graph, Backlinks, Outgoing Links, Tag Pane, Properties, Daily Notes, Templates, and Bases. GitSync Portal is the enabled community plugin. Calendar and Kanban files are present, but neither appears in the enabled-plugin list.

The folder structure gives both Pi and the person using the vault a shared way to put notes away and find them again.
