var net = require('net');
var tls = require('tls');
var pb = require("protobufjs");

var userdata = {};
var pages = {current:null};
var w;
var nick = 'iircUser'; // TODO: set per channel
var client;
var clientState = 'disconnected';
var loginButton; // assigned on 'login()'

var channelTabs = {};

var iirc = {
	common: pb.loadProtoFile("./proto/common.proto").build('iircCommon'),
	server: pb.loadProtoFile("./proto/server.proto").build('iircServer'),
	client: pb.loadProtoFile("./proto/client.proto").build('iircClient'),
};
var DataType = iirc.common.DataType;


// UTILS

function em(input) {
	var emSize = parseFloat($("body").css("font-size"));
	return (emSize * input);
}

function showPage(name) {
	if (pages.current)
		pages.current.hide();
	var newPage = pages[name];
	newPage.show();
	pages.current = newPage;
}


// INIT

$(function() {
	w = $(window);
	$('div[x-page]').addClass('page').each(function() {
		var name = $(this).attr('x-page');
		pages[name] = $(this);
	}).hide();
	showPage('login');
});


// STATES


var networkList = {
	items: {},
	clearConnections: function() {
		$('#connectionslist').children('div').remove();
	},
	addServer: function(nick) {
		var s = $('#connectionslist')
			.append($('<div/>').text(nick));
		return s;
	},
	addChannel: function(server, serverid, nick) {
		var c = server
			.append($('<div/>').text(nick));
		
		return c;
	}
};
function ChannelTab(serverId, channelId) {
	console.log(serverId, channelId);
	this.serverId = serverId;
	this.channelId = channelId;

	this.chatView = $('<div class="table"/>');
	this.nickView = $('<div/>');

	$('#chatlog').append(this.chatView);
	$('#userlist').append(this.nickView);

	this.hide = function() {
		this.chatView.hide();
		this.nickView.hide();
	}
	this.show = function() {
		this.chatView.show();
		this.nickView.show();
	}
	this.activate = function() {
		if (ChannelTab.current)
			ChannelTab.current.hide();
		ChannelTab.current = this;
		this.show();
	}
	this.addMessage = function(nick, text) {
		this.chatView
			.append($('<div class="table-row"/>')
				.append($('<div class="table-cell"/>').text(nick))
				.append($('<div class="table-cell"/>').text(text))
			);
	}
	this.clearUserList = function() {
		this.nickView.children('div').remove();
	}
	this.addUser = function(nick) {
		this.nickView
			.append($('<div/>').text(nick));
	}
	this.sendMessage = function(message) {
		var chatMessage = new iirc.client.ChatMessage(this.serverId, this.channelId, message);
		var chatMessageData = chatMessage.toBuffer();
		var header = new Buffer(2+8);
		header.writeUInt16LE(DataType.ChatMessage, 0);
		header.writeUInt32LE(chatMessageData.length, 2);
		header.writeUInt32LE(0, 6);

		client.write(header);
		client.write(chatMessageData);
		this.addMessage(nick, message);
	}
}
ChannelTab.current = null;
ChannelTab.get = function(serverId, channelId) {
	var tab = channelTabs[serverId+":"+channelId];
	if (!tab)
		tab = channelTabs[serverId+":"+channelId] = new ChannelTab(serverId, channelId);
	if (!ChannelTab.current)
		tab.activate();
	return tab;
}

function onMessage(type, buffer) {
	if (type == DataType.LoginResult) {
		var loginResult = iirc.server.LoginResult.decode(buffer);
		console.log(JSON.stringify(loginResult));
		if (loginResult.success)
			showPage('chat');
	}
	else if (type == DataType.BacklogNotification) {
		var backlogNotification = iirc.server.BacklogNotification.decode(buffer);
		console.log(JSON.stringify(backlogNotification));
		backlogNotification.channelBacklog.forEach(function(channel) {
			var tab = ChannelTab.get(backlogNotification.serverId, channel.channelId);
			channel.backlog.forEach(function(backlog) {
				tab.addMessage(backlog.nick, backlog.message);
			});
		});
	}
	else if (type == DataType.UserList) {
		var userList = iirc.server.UserList.decode(buffer);
		console.log(JSON.stringify(userList));
		var tab = ChannelTab.get(channel.serverId, channel.channelId);
		tab.clearUserList();
		userList.users.forEach(function(user) {
			tab.addUser(user.nick);
		});
	}
	else if (type == DataType.ConnectionsList) {
		var connectionsList = iirc.server.ConnectionsList.decode(buffer);
		console.log(JSON.stringify(connectionsList));
		networkList.clearConnections();
		connectionsList.servers.forEach(function(server) {
			var serverDiv = networkList.addServer(server.name);
			server.channels.forEach(function(channel) {
				var channelDiv = networkList.addChannel(serverDiv, channel.name);
			});
		});
	}
}

function connect() {
	if (clientState != 'disconnected') return;

	var useSsl = userdata.login.useSsl;
	var connector = useSsl ? tls : net;

	console.log (useSsl);
	console.log (connector == net);
	console.log (connector == tls);

	client = connector.connect({
		host: userdata.login.host,
		port: userdata.login.port
	});
	clientState = 'connected';
	client.on('data', (data) => {
		var buffer = data;
		while (buffer.length > 0) {
			console.log(JSON.stringify(buffer));
			
			var type = buffer.readUInt16LE(0);
			var size = {
				low: buffer.readUInt32LE(2),
				high: buffer.readUInt32LE(6)
			};
			console.log(JSON.stringify({type:type, size:size}));

			buffer = buffer.slice(2+8);
			onMessage(type, buffer);
			buffer = buffer.slice(size.low);
		}
	});
	client.on('end', () => {
		clientState = 'disconnected';
		loginButton.prop('disabled', false);
	});
	client.on('error', () => {
	});
}

function login(form) {
	if (!loginButton)
		loginButton = $(form).find('input[type=submit]');
	loginButton.prop('disabled', true);
	userdata.login = {
		host: form.host.value,
		port: form.port.value,
		username: form.username.value,
		password: form.password.value,
		useSsl: form.ssl.checked
	};
	connect();

	
	var login = new iirc.client.Login(userdata.login.username, userdata.login.password);
	var loginData = login.toBuffer();
	var header = new Buffer(2+8);
	header.writeUInt16LE(DataType.Login, 0);
	header.writeUInt32LE(loginData.length, 2);
	header.writeUInt32LE(0, 6);

	client.write(header);
	client.write(loginData);
}
