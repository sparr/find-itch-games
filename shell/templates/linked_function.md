{#-
   find-itch-games markdown reference, one function.

   Derived from shellman's wikipage_function.md template.
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

   Changed: see-also entries are passed through the link() macro.
-#}
{% from 'link.md' import link with context %}
### `{{ function.prototype }}`
{{ function.brief }}

{% if function.description %}
{{ function.description }}

{% endif %}
{% if function.arguments %}
#### Arguments
{% for argument in function.arguments %}
- **`{{ argument|firstword }}`**: {{ argument|body }}
{% endfor %}

{% endif %}
{% if function.return_codes %}
#### Return codes
{% for return_code in function.return_codes %}
- **`{{ return_code|firstword }}`**: {{ return_code|body }}
{% endfor %}

{% endif %}
{% if function.preconditions %}
#### Pre-conditions
{% for precondition in function.preconditions %}
- {{ precondition }}
{% endfor %}

{% endif %}
{% if function.seealso %}
#### See also
{% for seealso in function.seealso %}
- {{ seealso }}
{% endfor %}

{% endif %}
{% if function.stdin %}
#### Standard input
{% for stdin in function.stdin %}
- {{ stdin }}
{% endfor %}

{% endif %}
{% if function.stdout %}
#### Standard output
{% for stdout in function.stdout %}
- {{ stdout }}
{% endfor %}

{% endif %}
{% if function.stderr %}
#### Standard error
{% for stderr in function.stderr %}
- {{ stderr }}
{% endfor %}

{% endif %}
