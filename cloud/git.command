#!/bin/bash
#./git.command
export CURRENT="$(dirname "$0")"
cd $CURRENT

array=( \
	https://github.com/zenorocha/clipboard.js.git \
	https://github.com/ushelp/EasyQRCodeJS \
	https://github.com/elevateweb/elevatezoom.git \
	https://github.com/Studio-42/elFinder.git \
	https://github.com/fancyapps/fancybox.git \
	https://github.com/swisnl/jQuery-contextMenu.git \
	https://github.com/carhartl/jquery-cookie.git \
	https://github.com/jquery-form/form.git \
	https://github.com/tonytomov/jqGrid.git \
	https://github.com/ilikenwf/nestedSortable.git \
	https://github.com/marioizquierdo/jquery.serializeJSON.git \
	https://github.com/trentrichardson/jQuery-Timepicker-Addon.git \
	https://github.com/mediaelement/mediaelement.git \
	https://github.com/mediaelement/mediaelement-plugins.git \
	https://github.com/armaaar/JQuery-Sticky-Table \
)

for i in "${array[@]}"
do
	URL="$i"
	ASSET=`basename "$URL"`
	ASSET=${ASSET%%\?*}
	FILENAME=$(echo "$ASSET" | sed -e 's/\.[^.]*$//')
	if [ -d "$FILENAME" ]; then
		rm -rf "$FILENAME"
	fi
	git clone "$URL"
done

# BEGIN elFinder build
cd elFinder
npm install jake
npm install uglify-js
npm install csso
npm run build
cd ../
# END elFinder build

# remove demo* test* docs* docu* .*
find "./" -type d -name 'demo*' -o -name 'test*' -o -name 'exam*' -o -name 'docs*' -o -name 'docu*' -o -name '.git' -o -name '.gith*' -o -name '.npm*' -o -name 'node_modules*' -o -name '.trash*' -exec rm -r {} \;
