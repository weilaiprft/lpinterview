'use strict';

const WebSocket = require('ws');
const util = require('util')
const request = require("request");

const requestPromise = util.promisify(request);

var jwtOptions = {
    'method': 'POST',
    'url': 'https://va.idp.liveperson.net/api/account/13350576/signup',
    'headers': {
    }
};

const CONNECTED = 'Connection initialized successfully';
const REQUEST_CONVERSATION_RESPONSE = 'cm.RequestConversationResponse';

(async () => {
    // 1. Extract the JWT valu from the json response
    const response = await requestPromise(jwtOptions);
    const jwt = JSON.parse(response.body).jwt;
    console.log(`JWT = ${jwt}`);

    // 2. Use the extracted JWT to connect.
    const wsurl = 'wss://va.msg.liveperson.net/ws_api/account/13350576/messaging/consumer?v=3';
    const wsoptions = {"headers":{"Authorization": jwt}};
    const ws = new WebSocket(wsurl, {}, wsoptions);

    // add event handlers
    ws.on('open', onOpenHandler(jwt, ws));
    ws.on('message', onMessageHandler(ws));
    ws.on('close', onCloseHandler());

})();

function onMessageHandler(ws) {
    return (data) => {
        console.log(`server returned data : ${data}`);
        const obj = JSON.parse(data);
        console.log(obj.body);
        if (obj.body === CONNECTED) {
            requestNewConversation(ws);
        } else if (obj.type === REQUEST_CONVERSATION_RESPONSE) {
            sendFirstMessage(ws, obj.body.conversationId);
        }
    };
}

function onCloseHandler() {
    return () => {
        console.log('disconnected');
    };
}

function onOpenHandler(jwt, ws) {
    return () => {
        console.log('in ws open');
        // looks like jwt has to be in this format for it to work
        var obj = { "kind": "req", "id": "0", "type": "InitConnection", "headers": [{ "type": ".ams.headers.ClientProperties", "deviceFamily": "MOBILE", "os": "ANDROID" }, { "type": ".ams.headers.ConsumerAuthentication", "jwt": jwt }] };

        var str = JSON.stringify(obj);
        console.log(str);
        ws.send(str);
    };
}

// 3. request a new conversation
function requestNewConversation(ws){
    console.log('send new req');
    var obj = {"kind":"req","id":1,"type":"cm.ConsumerRequestConversation"};
    ws.send(JSON.stringify(obj));
}

// 4. publish content to a conversation
function sendFirstMessage(ws, conversation_id){
    console.log('send first message');
    var obj = {"kind":"req","id":2,"type":"ms.PublishEvent","body":{"dialogId":conversation_id,"event":{"type":"ContentEvent","contentType":"text/plain","message":"My first message"}}};
    ws.send(JSON.stringify(obj));
}