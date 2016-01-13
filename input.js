$(function() {
	$('#chatinput').keydown(function(e) {
		if (e.keyCode == 13 /* ENTER */ && !e.shiftKey) {
			e.preventDefault();
			if (clientState != 'connected') return;
			if (e.target.value != '') {
				var text = e.target.value;
				ChannelTab.current.sendMessage(text);
				e.target.value = "";
			}
		}
		else if (e.keyCode == 38 /* UP */) {
		}
		else if (e.keyCode == 40 /* DOWN */) {
		}
		else if (e.keyCode == 27 /* ESC */) {
		}
		else if (e.keyCode == 9 /* TAB */) {
		}
	});
});
