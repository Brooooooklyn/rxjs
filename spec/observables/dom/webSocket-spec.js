/* globals describe, it, expect, sinon, rxTestScheduler */
var Rx = require('../../../dist/cjs/Rx.DOM');
var Observable = Rx.Observable;

function noop() {
  // nope.
}

describe('Observable.webSocket', function () {
  beforeEach(function () {
    setupMockWebSocket();
  });

  afterEach(function () {
    teardownMockWebSocket();
  });

  it ('should send a message', function () {
    var messageReceived = false;
    var subject = Observable.webSocket('ws://mysocket');

    subject.next('ping');

    subject.subscribe(function (x) {
      expect(x).toBe('pong');
      messageReceived = true;
    });

    var socket = MockWebSocket.lastSocket();

    socket.open();
    expect(socket.lastMessageSent()).toBe('ping');

    socket.triggerMessage('pong');
    expect(messageReceived).toBe(true);
  });
});

var sockets = [];

function MockWebSocket(url, protocol) {
  sockets.push(this);
  this.url = url;
  this.protocol = protocol;
  this.sent = [];
  this.handlers = {};
  this.readyState = 1;
}

MockWebSocket.lastSocket = function () {
  return sockets.length > 0 ? sockets[sockets.length - 1] : undefined;
};

MockWebSocket.prototype = {
  send: function (data) {
    this.sent.push(data);
  },

  lastMessageSent: function () {
    var sent = this.sent;
    return sent.length > 0 ? sent[sent.length - 1] : undefined;
  },

  triggerClose: function (e) {
    this.readyState = 3;
    this.trigger('close', e);
  },

  triggerError: function (err) {
    this.readyState = 3;
    this.trigger('error', err);
  },

  triggerMessage: function (data) {
    var messageEvent = {
      data: JSON.stringify(data),
      origin: 'mockorigin',
      ports: undefined,
      source: __root__,
    };

    this.trigger('message', messageEvent);
  },

  open: function () {
    this.readyState = 1;
    this.trigger('open', {});
  },

  close: function (code, reason) {
    if (this.readyState < 2) {
      this.readyState = 2;
      this.closeCode = code;
      this.closeReason = reason;
      this.triggerClose();
    }
  },

  addEventListener: function (name, handler) {
    var lookup = this.handlers[name] = this.handlers[name] || [];
    lookup.push(handler);
  },

  removeEventListener: function (name, handler) {
    var lookup = this.handlers[name];
    if (lookup) {
      for (var i = lookup.length - 1; i--;) {
        if (lookup[i] === handler) {
          lookup.splice(i, 1);
        }
      }
    }
  },

  trigger: function (name, e) {
    if (this['on' + name]) {
      this['on' + name](e);
    }

    var lookup = this.handlers[name];
    if (lookup) {
      for (var i = 0; i < lookup.length; i++) {
        lookup[i](e);
      }
    }
  }
}

var __ws;
function setupMockWebSocket() {
  sockets = [];
  __ws = __root__.WebSocket;
  __root__.WebSocket = MockWebSocket;
}

function teardownMockWebSocket() {
  __root__.WebSocket = __ws;
  sockets = null;
}