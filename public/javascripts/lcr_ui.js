var dialogs = {};

function showDialog(title, contents, modal, callback) {
    var dialog = document.getElementById('dialog');

    var body = dialog.getElementsByClassName('body')[0];        
    body.innerHTML = '';

    var titleEl = dialog.getElementsByClassName('title')[0];
    titleEl.innerHTML = '';

    if (title) {
        titleEl.innerHTML = title;
    }

    if (contents) {
        body.appendChild(contents);
    }

    dialog.dataset.uid = 'dialog_' + Date.now();
    dialogs[dialog.dataset.uid] = {
        dialog: dialog,
        callback: callback
    }

    if (modal) {
        dialog.showModal();
    } else {
        dialog.show();
    }
}

function closeDialog(evt, el) {
    console.warn('closeDialog: ', evt, el);
    el = el || evt.target;
    var target = el.parentElement;
    var dialog = null;
    while (dialog === null && target.parentElement !== null) {
        target = target.parentElement;
        if (target.tagName == 'DIALOG') {
            dialog = target;
            break;
        }
    }
    if (dialog) {
        dialog.close();
    }
}

function submitDialog(evt, el) {
    console.warn('submitDialog: ', evt, el);
    el = el || evt.target;
    var target = el.parentElement;
    var dialog = null;
    while (dialog === null && target.parentElement !== null) {
        target = target.parentElement;
        if (target.tagName == 'DIALOG') {
            dialog = target;
            break;
        }
    }
    if (dialog) {
        var body = dialog.getElementsByClassName('body')[0];
        var inputs = body.getElementsByTagName('input');
        var name = null;
        var value = null;
        var values = {};
        var input = null;
        var select = null;
        for (var i = 0; i < inputs.length; i++) {
            input = inputs[i];
            name = input.getAttribute('name');
            value = input.value;
            values[name] = value;
        }
        
        var selects = body.getElementsByTagName('select');
        for (var i = 0; i < selects.length; i++) {
            select = selects[i];
            console.warn('select: ', select);
            name = select.getAttribute('name');
            value = select.options[select.selectedIndex].text;
            values[name] = value;
        }

        console.warn('values: ', values);

        var callback = dialogs[dialog.dataset.uid].callback;
        if (typeof callback === 'function') {
            callback(values, null);
        }
        dialog.close(); 
    }
}
