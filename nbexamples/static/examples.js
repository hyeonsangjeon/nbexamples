// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

define([
    'base/js/namespace',
    'jquery',
    'base/js/utils',
    'base/js/dialog',
], function(Jupyter, $, utils, dialog) {
    "use strict";

    var dialog_html = [
        '<div class="modal fade" tabindex="-1" role="dialog" aria-labelledby="nbexamples-modal-label">',
        ' <div class="modal-dialog" role="document">',
        '  <div class="modal-content">',
        '   <div class="modal-header">',
        '    <h4 id="nbexamples-modal-label" class="modal-title">Fetch a fresh copy to your notebook directory</h4>',
        '   </div>',
        '   <form action="examples/fetch" method="get" target="' + Jupyter._target + '">',
        '    <div class="modal-body">',
        '     <label class="control-label" for="nbexamples-clone-name">Save Copy As</label>',
        '     <input type="text" name="dest" id="nbexamples-clone-name" />',
        '     <input type="hidden" name="example_id" />',
        '    </div>',
        '    <div class="modal-footer">',
        '     <button class="btn btn-default" type="button" data-dismiss="modal">Cancel</button>',
        '     <button class="btn btn-primary" type="submit">Fetch a Copy</button>',
        '    </div>',
        '   </form>',
        '  </div>',
        ' </div>',
        '</div>'
    ].join('\n');

    var Examples = function (reviewed_selector, unreviewed_selector, options) {
        this.reviewed_selector = reviewed_selector;
        this.unreviewed_selector = unreviewed_selector;

        this.reviewed_element = $(reviewed_selector);
        this.unreviewed_element = $(unreviewed_selector);
        this.dialog_element = $(dialog_html).appendTo('body');
        this.bind_events();

        options = options || {};
        this.options = options;
        this.base_url = options.base_url || utils.get_body_data("baseUrl");
    };

    Examples.prototype.bind_events = function () {
        var that = this;
        $('#refresh_examples_list').click(function () {
            that.load_list();
        });

        // Hide the modal dialog on submit. The declarative attribute does
        // not work when form submission is involved.
        this.dialog_element.on('submit', '.modal-dialog form', function(evt) {
            $(evt.target).closest('.modal').modal('hide');
        });

        // Show the singleton dialog when the user clicks the use button for any
        // example. Set the example ID in the hidden element field.
        [this.reviewed_element, this.unreviewed_element].forEach(function(element) {
            element.on('click', '[data-filepath]', function(evt) {
                var filepath = $(evt.target).data('filepath');
                that.dialog_element
                    .find('[name="example_id"]')
                    .attr('value', filepath);
                that.dialog_element.modal('show');
            });
        });
    };

    Examples.prototype.load_list = function () {
        var settings = {
            processData : false,
            cache : false,
            type : "GET",
            dataType : "json",
            success : $.proxy(this.load_list_success, this),
            error : utils.log_ajax_error,
        };
        var url = utils.url_join_encode(this.base_url, 'examples');
        $.ajax(url, settings);
    };

    Examples.prototype.clear_list = function () {
        // remove list items
        this.reviewed_element.children('.list_item').remove();
        this.unreviewed_element.children('.list_item').remove();

        // show placeholders
        this.reviewed_element.children('.list_placeholder').show();
        this.unreviewed_element.children('.list_placeholder').show();
    };

    Examples.prototype.load_list_success = function (data, status, xhr) {
        this.clear_list();
        var len = data.length;
        for (var i=0; i<len; i++) {
            var element = $('<div/>');
            var item = new Example(element,
                data[i],
                this.options
            );
            this.reviewed_element.append(element);
            if (data[i]['category'] === 'reviewed') {
                this.reviewed_element.children('.list_placeholder').hide();
            } else if (data[i]['category'] === 'unreviewed') {
                this.unreviewed_element.append(element);
                this.unreviewed_element.children('.list_placeholder').hide();
            }
        }
    };

    var Example = function (element, data, options) {
        this.element = $(element);
        this.data = data;
        this.options = options;
        this.base_url = options.base_url || utils.get_body_data("baseUrl");
        this.style();
        this.make_row();
    };

    Example.prototype.style = function () {
        this.element.addClass('list_item').addClass("row");

        // If this example is active, highlight it
        if(this.options.active_example_id === this.data.filepath) {
            this.element.addClass('bg-info');
            // Clear the active pointer so that it doesn't highlight again when
            // the user refreshes the list
            this.options.active_example_id = null;
        }
    };

    Example.prototype.hash = function(s){
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    }

    Example.prototype.make_row = function () {
        var row = $('<div/>').addClass('col-md-12');
        var display_title = this.data.metadata.title || this.data.filepath
        row.append($('<span/>').addClass('item_name').text(display_title));
        row.append($('<span/>')
            .addClass('item_summary')
            .text(this.data.metadata.summary));
        var btns = $('<div/>').addClass('item-buttons pull-right');
        if (this.data.owned & (this.data.category == 'unreviewed')) {
            btns.append($('<a/>')
                .attr("href", utils.url_join_encode(this.base_url, "examples/delete") +
                    "?example_id=" +
                    encodeURIComponent(this.data.filepath))
                .addClass("btn btn-danger btn-xs")
                .attr("target", "_self")
                .text('Delete'));
        }
        btns.append($('<a/>')
            .attr("href",
                utils.url_join_encode(this.base_url, "examples/preview") +
                "?example_id=" +
                encodeURIComponent(this.data.filepath))
            .addClass("btn btn-info btn-xs")
            .attr("target", Jupyter._target)
            .text('Preview'));
        btns.append($('<button/>')
            .addClass("btn btn-success btn-xs")
            .attr('data-filepath', this.data.filepath)
            .text('Use'));
        row.append(btns);
        this.element.empty().append(row);
    };

    return {
        'Examples': Examples,
        'Example': Example
    };
});
