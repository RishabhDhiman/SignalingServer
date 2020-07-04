"use strict";
var WebSocketServer = require("ws").Server;
var ArrayList = require("arraylist");
var wrtc = require("wrtc");
var wss = new WebSocketServer({ port: process.env.PORT||9090 });
var RTCPeerConnection = wrtc.RTCPeerConnection;
var RTCSessionDescription = wrtc.RTCSessionDescription;
var users = {};
const got = require("got");

//var list = new ArrayList();

var pc;


keepScriptRunning();

//when a user connects to our sever
wss.on("connection", function (connection) {
  console.log("User connected");

  //when server gets a message from a connected user
  connection.on("message", function (message) {
    var data;
    //accepting only JSON messages
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.log("Invalid JSON " + message);
      data = {};
    }

    switch (data.type) {
      case "login":
        login(connection, data);
        break;

      case "offer":
        offer(data);
        break;

      case "answer":
        answer(data);
        break;

      case "candidate":
        candidate(data);
        break;
      case "leave":
        leave(connection);
        break;
      default:
        defaultCase(connection);
        break;
    }
  });

  connection.on("close", function () {
    if (users[connection.roomName] && users[connection.roomName]) {
      if (users[connection.roomName].users[1]) {
        sendTo(users[connection.roomName].users[1].connection, {
          type: "leave",
        });
      }
      if (users[connection.roomName].users[0]) {
        sendTo(users[connection.roomName].users[0].connection, {
          type: "leave",
        });
      }
      console.log("Room Empty");
      delete users[connection.roomName];
    }
  });

  connection.send('{"type":"connection"}');
});

function login(connection, data) {
  console.log("User logged", data.name + " in room " + data.roomName);
  if (!users[data.roomName]) {
    connection.isInitiator = true;
    connection.roomName = data.roomName;
    users[data.roomName] = {};
    users[data.roomName].userCount = 0;
    users[data.roomName].users = [];
    users[data.roomName].users[users[data.roomName].userCount] = {};
    users[data.roomName].users[users[data.roomName].userCount].name = data.name;
    users[data.roomName].users[
      users[data.roomName].userCount
    ].connection = connection;
    users[data.roomName].userCount++;
    sendTo(connection, {
      type: "initiator",
      initiator: true,
    });
  } else {
    if (users[data.roomName].userCount == 2) {
      sendTo(connection, {
        type: "roomFull",
        answer: "Room is full",
      });
    } else {
      connection.isInitiator = false;
      connection.roomName = data.roomName;
      users[data.roomName].users[users[data.roomName].userCount] = {};
      users[data.roomName].users[users[data.roomName].userCount].name =
        data.name;
      users[data.roomName].users[
        users[data.roomName].userCount
      ].connection = connection;
      console.log("Object", users);
      users[data.roomName].userCount++;
      sendTo(connection, {
        type: "initiator",
        initiator: false,
      });

      sendTo(users[data.roomName].users[0].connection, {
        type: "peerArrived",
      });
    }
  }
}

function offer(data) {
  users[data.roomName].users[0].sessionDescription = data.sessionDescription;
  sendTo(users[data.roomName].users[1].connection, {
    type: "offer",
    sessionDescription: data.sessionDescription,
  });
}

function answer(data) {
  users[data.roomName].users[1].sessionDescription = data.sessionDescription;
  sendTo(users[data.roomName].users[0].connection, {
    type: "answer",
    sessionDescription: data.sessionDescription,
  });
}

function candidate(data) {
  if (data.isInitiator) {
    users[data.roomName].users[0].iceCandidate = data.iceCandidate;
    sendTo(users[data.roomName].users[1].connection, {
      type: "candidate",
      iceCandidate: data.iceCandidate,
    });
  } else {
    users[data.roomName].users[1].iceCandidate = data.iceCandidate;
    sendTo(users[data.roomName].users[0].connection, {
      type: "candidate",
      iceCandidate: data.iceCandidate,
    });
  }
}

function defaultCase(connection) {
  sendTo(connection, {
    type: "error",
    message: message,
  });
}
function leave(connection) {
  console.log("Disconnecting from", data.name);
  var conn = users[data.name];
  conn.otherName = null;

  //notify the other user so he can disconnect his peer connection
  if (conn != null) {
    sendTo(conn, {
      type: "leave",
    });
  }
}

function finish(connection) {
  if (pc.signalingState === "closed") {
    return;
  }
  pc.close();
}

function sendTo(connection, message) {
  connection.send(JSON.stringify(message));
}

function keepScriptRunning(){
  got("https://earthquake-notifier-server.herokuapp.com/").then((response)=>{
    console.log("keeping script running")
    setTimeout(keepScriptRunning, 1740000);
  }).catch((error)=>{
    setTimeout(keepScriptRunning, 1740000);
  });
}
