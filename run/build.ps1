#!/usr/bin/env sh
echo --% >/dev/null;: ' | out-null
<#'

#
# for not-Windows operating systems
#
deno run -A 'https://esm.sh/gh/jeff-hykin/bite@5.4.10.2/vite/bin/vite.js' build ./main --outDir ../docs --emptyOutDir
deno run -A https://esm.sh/gh/jeff-hykin/html-bundle@0.0.3.0/main/html-bundle.js --inplace ./docs/index.html

exit #>

#
# for windows (powershell)
#
deno run -A 'https://esm.sh/gh/jeff-hykin/bite@5.4.10.2/vite/bin/vite.js' build ./main --outDir ../docs --emptyOutDir
deno run -A https://esm.sh/gh/jeff-hykin/html-bundle@0.0.3.0/main/html-bundle.js --inplace ./docs/index.html