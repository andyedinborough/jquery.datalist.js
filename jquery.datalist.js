// HTML5 datalist plugin v.0.1
// Copyright (c) 2010-The End of Time, Mike Taylor, http://miketaylr.com
// MIT Licensed: http://www.opensource.org/licenses/mit-license.php
//
// Enables cross-browser html5 datalist for inputs, by first testing
// for a native implementation before building one.
//
//
// USAGE: 
//$('input[list]').datalist();

/* 
<input type="search" list="suggestions">
<datalist id="suggestions">
<!--[if !IE]><!-->
<select><!--<![endif]-->
<option label="DM" value="Depeche Mode">
<option label="Moz" value="Morrissey">
<option label="NO" value="New Order">
<option label="TC" value="The Cure">
<!--[if !IE]><!-->
</select><!--<![endif]-->
</datalist>
*/
(function (window, $, undefined) {
    var document = window.document,
        native_support =
            !!('data' in document.createElement('datalist')) && //bye bye Opera
            !!window.HTMLDataListElement &&
            !!('list' in document.createElement('input')),
            some = Array.prototype.some || function (func) {
                var ret;
                for (var i = 0, ii = this.length; i < ii; i++) {
                    if ((ret = func(this[i], i, this))) {
                        return ret;
                    }
                }
                return false;
            },
            filter = Array.prototype.filter || function (func) {
                var ret = [];
                for (var i = 0, ii = this.length, iii; i < ii; i++) {
                    if (func(iii = this[i], i, this)) ret.push(iii);
                }
                return ret;
            };

    //return a number
    function an(n) {
        return parseInt(n, 10) || 0;
    }

    function zIndex() {
        return Math.max.apply(undefined, $('*').map(function () {
            return an($(this).css('z-index'));
        }).get());
    }

    function buildOptions($this, ul, opts) {
        //otherwise, build the structure
        var lis = [];
        opts.each(function (i) {
            var opt = $(this), value = opt.attr('value') || opt.text(), label = opt.attr('label') || opt.text(), li;
            lis.push(li = $('<li style="padding: 2px; white-space: nowrap">')
                .append('<span class="value">' + value + '</span>')
                .append($('<span>', { 'css': {
                    opacity: 0.8,
                    'font-style': 'italic',
                    'float': 'right',
                    display: label === value ? 'none' : 'inline'
                }
                }).text(label))
                .attr('title', label || value || '')
                .appendTo(ul)[0]);
            li.dataText = (label + ' ' + value).toLowerCase();
        });

        return lis;
    }

    function search($this, lis, context) {
        var value = $this.val().toLowerCase(),
            matches = context.matches || (context.matches = lis),
            list = value.length > 0 && value.indexOf(context.last) === 0 ? matches : lis;

        if (context.last === value) return;
        context.last = value;

        context.matches = filter.call(list, function (li) {
            if (value.length === 0 || li.dataText.indexOf(value) > -1) {
                li.style.display = 'block';
                return true;
            }
            li.style.display = 'none';
        });
    }

    function position(elm, relativeTo, corner) {
        var off = relativeTo.position(), z = zIndex();
        corner = corner || 'tl';
        elm.css({
            top: off.top + (corner.indexOf('b') > -1 ? relativeTo.outerHeight() : -1) + an(relativeTo.css('margin-top')),
            left: off.left + (corner.indexOf('r') > -1 ? relativeTo.outerWidth() : 0) + an(relativeTo.css('margin-left')),
            'z-index': Math.max(z, 0) + 100
        });
    }

    $.fn.datalist = function (options) {
        options = $.extend({}, { native_support: native_support, url: '', width: 0 }, options);

        //first test for native placeholder support before continuing
        return options.native_support ? this : this.each(function () {
            //local vars
            var $this = $(this), lis, tmrHide,
            //the main guts of the plugin
                datalist = $(document.getElementById($this.attr('list'))),
                opts = datalist.find('option'),

            //wrapper stuffs
                width = $this.outerWidth() - 2, // + sum.call($this, 'border-left', 'border-right', 'padding-left', 'padding-right'),
                height = $this.height(),
                ul = $("<ul>", {
                    "css": {
                        "width": options.width || width,
                        'position': $this.css('position') === 'fixed' ? 'fixed' : 'absolute',
                        'margin': 0,
                        'padding': 0,
                        'list-style': 'none',
                        'border': '1px solid #ccc',
                        '-moz-box-shadow': '0px 2px 3px #ccc',
                        '-webkit-box-shadow': '0px 2px 3px #ccc',
                        'box-shadow': '0px 2px 3px #ccc',
                        'cursor': 'default',
                        'background-color': 'Menu',
                        'color': 'MenuText',
                        'max-height': 130,
                        'overflow': 'auto',
                        'font-size': $this.css('font-size'),
                        'font-family': $this.css('font-family'),
                        'line-height': $this.css('line-height'),
                        'font-weight': 'normal'
                    }
                });

            $this.removeAttr('list').attr('autocomplete', 'off'); //disable native support when it's insufficient

            //continue if matching datalist isn't found
            if (!datalist.length && !options.url) return; //continue

            if (options.url || datalist.attr('data')) {
                $.get(options.url || datalist.attr('data')).success(function (ret) {
                    lis = buildOptions($this, ul, $(ret).find('option'));
                });
            } else lis = buildOptions($this, ul, opts);

            //stick the stuff in and hide it
            ul.hide().insertAfter($this);

            var searchContext = { last: '' };
            $this
                .bind('start-hide', function () {
                    $this.trigger('cancel-hide');
                    tmrHide = setTimeout(function () { $this.trigger('hide-now'); }, 300);
                })
                .bind('cancel-hide', function () {
                    clearTimeout(tmrHide);

                }).bind('hide-now', function (e) {
                    ul.hide();
                    if (e.refocus) $this.trigger({ type: 'focus', noshow: true });

                }).bind('focus show-now', function (e) {
                    if (e.noshow) return;
                    $this.trigger('cancel-hide');
                    position(ul, $this, 'bl');
                    if (e.type === 'focus') $this.trigger('search');
                    ul.show();
                })

                .blur(function () { $this.trigger('start-hide'); })
                .bind('keyup search', function (e) {
                    if (e.keyCode && $.inArray(e.keyCode, [27, 10, 13, 38, 40, 9]) > -1) return;
                    if (!ul.is(':visible')) $this.trigger('show-now');
                    clearTimeout(searchContext.tmr);
                    searchContext.tmr = setTimeout(function () {
                        search($this, lis, searchContext);
                    }, 200);

                })
                .keydown(function (e) {
                    if (e.keyCode <= 40) {
                        var selected = ul.find('li.selected:visible');
                        if (e.keyCode == 38) { //up
                            e.preventDefault();
                            if (!ul.is(':visible')) $this.trigger('show-now');
                            if (selected.length) {
                                selected = selected
                                .trigger('mouseleave')
                                .prev(':visible');
                            }

                        } else if (e.keyCode === 40) { //down
                            e.preventDefault();
                            if (!ul.is(':visible')) $this.trigger('show-now');
                            if (selected.length) {
                                selected = selected
                                .trigger('mouseleave')
                                .next(':visible');
                            } else {
                                selected = ul.find('li:visible:first')
                                .trigger('mouseenter');
                            }

                        } else if (e.keyCode === 27 && ul.is(':visible')) {
                            e.preventDefault();
                            $this.trigger({ type: 'hide-now', refocus: true });

                        } else if (e.keyCode === 13 || e.keyCode === 9 && ul.is(':visible')) {
                            e.preventDefault();
                            selected.trigger('click');
                        }

                        if (selected.length) {
                            var top = selected[0].offsetTop, scrollTop = ul.scrollTop(), ulHeight = ul.height(), height = selected.height();
                            if (scrollTop + ulHeight < top + height * 2.5) {
                                ul.stop().animate({ scrollTop: top - ulHeight + height * 2.5 }, 50);
                            } else if (scrollTop > top) {
                                ul.stop().animate({ scrollTop: top - height }, 50);
                            }
                            selected.trigger('mouseenter');
                        }
                    }
                });

            //set value of input to clicked option
            ul.delegate('li', 'click', function () {
                var value = $(this).find('span.value').text();
                $this.val(value).trigger({ type: 'hide-now', refocus: true });

            }).delegate('li', 'mouseenter', function () {
                ul.find('.selected').removeClass('selected');
                $(this).css({
                    'background-color': 'Highlight',
                    'color': 'HighlightText'
                }).addClass('selected');

            }).delegate('li', 'mouseleave', function () {
                $(this).css({
                    'background-color': 'Menu',
                    'color': 'MenuText'
                }).removeClass('selected');

            }).bind('scroll', function () {
                $this.triggerHandler('focus');
            });
        });
    };

    $(function () { $('[list]').datalist(); });

})(window, jQuery);