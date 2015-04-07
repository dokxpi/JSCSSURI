

var itoc_defaultSettings = {
	'itoc_descriptions' : '[]',
	'itoc_images' : '[]',
	'itoc_showDate' : 'true',
	'itoc_showDesc' : 'true',
	'itoc_showImg' : 'false',
	'itoc_showImgOnlyWithDesc' : 'true',
	'itoc_showEmptyDescDiv' : 'false',
	'itoc_maxDescLength' : '500',
	'itoc_minContentLength' : '700',
	'itoc_minDescLength' : '30',
	'itoc_sortBy' : '"published"',
	'itoc_sortOrderAscending' : 'true'
};

for (var key in itoc_defaultSettings) {
	if (typeof itoc_defaultSettings[key] == "function") continue;
	eval('if (typeof ' + key + ' == "undefined") ' + key + ' = ' + itoc_defaultSettings[key]);
}


var itoc_categoryIndex = [];
var itoc_categoryIndexCreated = {};
var itoc_categoryDescriptions = {};
var itoc_categoryForLabel = {};


var itoc_totalLabels = 0;
var itoc_receivedReplies = 0;
var itoc_receivedItems = {};

var itoc_sortOrderFactor = itoc_sortOrderAscending ? 1 : -1;


document.write("<div class='itoc'><div id='itoc_data840980'></div></div>");

/* Заполнение вспомогательных структур на основе настроек категорий. */

for (var i = 0; i < itoc_categories.length; i++) {
	if (typeof itoc_categories[i] == "function") continue;

	var category = itoc_categories[i][1] || itoc_categories[i][0];

	if (!itoc_categoryIndexCreated[category]) {
		itoc_categoryIndexCreated[category] = true;
		itoc_categoryIndex.push(category);
	}

	if (itoc_categories[i][2])
		itoc_categoryDescriptions[category] = itoc_categories[i][2];

	if (itoc_categories[i][0]) {
		itoc_totalLabels++;
		itoc_categoryForLabel[itoc_categories[i][0]] = category;
	}
}

/* Посылаем запросы на получение фидов. */

for (var i = 0; i < itoc_categories.length; i++) {
	if (typeof itoc_categories[i] == "function") continue;
	itoc_categories[i][0] && itoc_sendQueryForLabel(itoc_siteUrl, itoc_categories[i][0]);
}

function itoc_sendQueryForLabel(query, label) {
	var script = document.createElement('script');
	script.setAttribute('src', query + 'feeds/posts/default/-/'
		+ label +
		'?alt=json-in-script&callback=itoc_receiveReply_dfsyufsdxvc789j&max-results=999');
	script.setAttribute('type', 'text/javascript');
	document.documentElement.firstChild.appendChild(script);
}

/*  Обработчик полученного фида. */

function itoc_receiveReply_dfsyufsdxvc789j(json) {
	var label = "";
	for (var l = 0; l < json.feed.link.length; l++) {
		if (typeof json.feed.link[l] == "function") continue;
		if (json.feed.link[l].rel == 'alternate') {
			var raw = json.feed.link[l].href;
			var label = raw.substr(itoc_siteUrl.length+13);
			var k;
			for (k=0; k<20; k++) {
				label = label.replace("%20", " ");
				label = label.replace("%3B", ";");
			}
			label = decodeURI(label);
			break;
		}
	}
	var category = itoc_categoryForLabel[label];
	if (typeof itoc_receivedItems[category] != "object")
		itoc_receivedItems[category] = [];

	for (var k in json.feed.entry) {
		var entry = json.feed.entry[k];
		if (typeof entry == "function") continue;
		var href = "";
		for (var kl in entry.link) {
			if (typeof entry.link[kl] == "function") continue;
			if (entry.link[kl].rel == "alternate") {
				href = entry.link[kl].href;
				break;
			}
		}

		for (var i = 0; i < itoc_receivedItems[category].length; i++) {
			if (itoc_receivedItems[category][i].href == href) {
				href ='';
				break;
			}
		}

		if (href != "") {
			var item = {
				"href"        : href,
				"title"       : entry.title.$t,
				"published"   : entry.published.$t,
				"description" : itoc_getShortDescFor(entry.content.$t),
				"image"       : itoc_getImageFor(entry.content.$t)
			};
			if (typeof itoc_onItemReceived == 'function') {
				item = itoc_onItemReceived(item, entry);
			}
			itoc_receivedItems[category].push(item);
		}
	}

	itoc_labelReceived();

}

function itoc_progressBar(current, total) {
	var s = '';
	s += '<table class="progressbartable"><tr>';
	for (var i = 0; i < total; i++) {
		s += '<td class="' + (i < current ? 'ready' : 'notready') + '"></td>';
	}
	s += '</tr><tr>';
	s += '<td class="progressbartext" colspan="'+total+'">' + current + '/' + total + '</td>';
	s += '</tr></table>';
	return s;
}

/* Выдача результатов. */

function itoc_labelReceived() {

	mydiv = document.getElementById('itoc_data840980');

	itoc_receivedReplies++;

	mydiv.innerHTML = itoc_progressBar(itoc_receivedReplies, itoc_totalLabels);

	if (itoc_receivedReplies != itoc_totalLabels)
		return;

	mydiv.innerHTML = itoc_getToCHtml();

	itoc_categoryIndex = undefined;
	itoc_categoryForLabel = undefined;
	itoc_categoryDescriptions = undefined;
	itoc_categoryIndexCreated = undefined;
	itoc_categories = undefined;
	itoc_receivedItems = undefined;
}

if (typeof itoc_getImageFor != 'function') itoc_getImageFor = function(content) {

	/* Хитрый код для получения картинки к сообщению. */

	/* Извлекаем первую картинку сообщения. */
	var img = /<\s*img\s+[^>]*>/.exec(content);
	if (!img)
		return '';
	img = img[0];

	/* Проверяем, что это нормальная картинка, а не гугловский однопиксельный счетчик. */
	if (img.indexOf('googleusercontent') > -1)
		return '';

	/* Извлекаем адрес */
	img = /\s*src\s*=\s*((['][^']*['])|(["][^"]*["]))/.exec(img)
	if (!img)
		return '';

	return img[1];
}

if (typeof itoc_getShortDescFor != 'function') itoc_getShortDescFor = function(content) {

	/* Хитрый код для формирования краткого описания поста. */

	/* Сначала вырезаем все картинки, а также внедренные на страницу объекты,
	   такие как youtube-ролики и флеш-ролики, чтобы они не мешали нам
	   определить "чистый" размер текста на странице. */
	content = content.replace(/\s*<\s*\/?\s*(object|param|embed|img)[^>]*>\s*/g, ' ');
	content = content.replace(/(&nbsp;)+/g, ' ');
	content = content.replace(/\s+/g, ' ');

	/* Для коротких страниц (меньше чем minContentLength символов) не выводим описание вообще. */
	if (content.length < itoc_minContentLength) {
		return '';
	}

	/* Обрезаем пост по одному из следующих тегов: начало ката, начало многострочной цитаты, преформатированной области, таблицы, или списка. */
	content = content.split(/<\s*a\s*name\s*=\s*.more/)[0];
	content = content.split(/<\s*(blockquote|pre|table|tr|td|ul|ol|li|dl|dt|dd)[^a-z]/)[0];

	if (content.length < itoc_minDescLength) {
		return '';
	}

	/* Вырезаем зачеркнутый текст (тег strike) */
	content = content.replace(/<((s)|(strike))>(.*)<\/((s)|(strike))>/g, ' ');

	/* Убираем всё остальное форматирование, удаляя теги. */
	content = content.replace(/\s*<[^>]*>\s*/g, ' ');

	/* Если получившийся текст превышает максимальный размер описания, обрезаем его по размеру. */
	if (content.length > itoc_maxDescLength) {
		content = content.substring(0, itoc_maxDescLength);
		/* В урезанном тексте удаляем последнее слово, т.к. оно может быть не полным. */
		content = content.split(/\s\S*$/)[0];
	}

	/* Удаляем в конце знаки препинания и добавляем многоточие. */
	content = content.split(/\s*[\:.,;]*\s*$/)[0] + '... ';

	return content;
}

if (typeof itoc_compareItems != 'function') itoc_compareItems = function(a, b) {
	var aa = a[itoc_sortBy], bb = b[itoc_sortBy];
	if (aa < bb)
		return -1 * itoc_sortOrderFactor;
	if (aa > bb)
		return 1 * itoc_sortOrderFactor;
	return 0;
}

if (typeof itoc_getToCHtml != 'function') itoc_getToCHtml = function() {
	var s = '';

	for (var i = 0; i < itoc_categoryIndex.length; i++) {
		if (typeof itoc_categoryIndex[i] == "function") continue;

		/* Заголовки и описания категорий. */
		var category = itoc_categoryIndex[i];
		s += "<h4>" + category + "</h4>";
		if (itoc_categoryDescriptions[category])
			s += "<p>" + itoc_categoryDescriptions[category] + "</p>";

		/* Сортировка списка постов. */
		itoc_receivedItems[category] = itoc_receivedItems[category].sort(itoc_compareItems);

		/* Выдача списка постов. */
		s += itoc_getHtmlForItems(itoc_receivedItems[category]);
	}
	return s;
}

if (typeof itoc_getHtmlForItems != 'function') itoc_getHtmlForItems = function(items) {
	var s = '';
	s += '<ul>';
	for (var k = 0; k < items.length; k++) {
		var item = items[k];
		if (typeof item == "function") continue;
		s += '<li>';
		s += itoc_getHtmlForItem(item);
		s += '</li>';
	}
	s += '</ul>';
	return s;
}

if (typeof itoc_getHtmlForItem != 'function') itoc_getHtmlForItem = function(item) {
	var s = '';

	var d = /([0-9]+)-([0-9]+)-([0-9]+)T/.exec(item.published);

	s += '<div class="header">';

	if (itoc_showDate) {
		s += '<span class="date">'+d[3]+'.'+d[2]+'.'+d[1]+'</span> ';
	}

	s += '<a href="'+item.href+'">'+item.title+'</a>';

	s += '</div>';

	var desc = itoc_descriptions[item.href] != undefined ? itoc_descriptions[item.href] : item.description;

	var image = item.image;

	if (itoc_images[item.href] != undefined) {
		image = '"'+itoc_images[item.href]+'"';
	}

	if (itoc_showImg && image && (desc || !itoc_showImgOnlyWithDesc)) {
		s += '<img alt="" src='+image+'>';
	}

	if (itoc_showDesc && (desc || itoc_showEmptyDescDiv)) {
		s += '<div class="desc">'+desc+'<div class="endofdesc"></span></span> ';
	}

	return s;
}

