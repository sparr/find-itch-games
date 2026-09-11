{#-
   find-itch-games markdown reference, table of contents.

   Derived from shellman's wikipage_toc.md template.
   shellman is ISC licensed, Copyright (c) 2020, Timothée Mazzucotelli:

     Permission to use, copy, modify, and/or distribute this software for any
     purpose with or without fee is hereby granted, provided that the above
     copyright notice and this permission notice appear in all copies.

     THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
     WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
     MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
     ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
     WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
     ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
     OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

   Unchanged. Present because linked.md includes it by name, and the Jinja
   loader resolves includes relative to this directory rather than to
   shellman's own templates.
-#}
{% if shellman.doc.usage %}
- [Usage](#usage)
{% endif %}
{% if shellman.doc.desc %}
- [Description](#description)
{% endif %}
{% if shellman.doc.option %}
- [Options](#options)
{% endif %}
{% if shellman.doc.env %}
- [Environment Variables](#environment-variables)
{% endif %}
{% if shellman.doc.file %}
- [Files](#files)
{% endif %}
{% if shellman.doc.exit %}
- [Exit Status](#exit-status)
{% endif %}
{% if shellman.doc.stdin %}
- [Standard Input](#standard-input)
{% endif %}
{% if shellman.doc.stdout %}
- [Standard Output](#standard-output)
{% endif %}
{% if shellman.doc.stderr %}
- [Standard Error](#standard-error)
{% endif %}
{% if shellman.doc.function %}
- [Functions](#functions)
{% endif %}
{% if shellman.doc.example %}
- [Examples](#examples)
{% endif %}
{% if shellman.doc.error %}
- [Errors](#errors)
{% endif %}
{% if shellman.doc.bug %}
- [Bugs](#bugs)
{% endif %}
{% if shellman.doc.caveat %}
- [Caveats](#caveats)
{% endif %}
{% if shellman.doc.author %}
- [Authors](#authors)
{% endif %}
{% if shellman.doc.copyright %}
- [Copyright](#copyright)
{% endif %}
{% if shellman.doc.license %}
- [License](#license)
{% endif %}
{% if shellman.doc.history %}
- [History](#history)
{% endif %}
{% if shellman.doc.note %}
- [Notes](#notes)
{% endif %}
{% if shellman.doc.seealso %}
- [See Also](#see-also)
{% endif %}
