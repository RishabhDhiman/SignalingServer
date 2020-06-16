'use strict';
//require our websocket library 
var WebSocketServer = require('ws').Server;
var wrtc = require("wrtc");
//creating a websocket server at port 9090 
var wss = new WebSocketServer({port: 9090});

var RTCPeerConnection = wrtc.RTCPeerConnection;
var RTCSessionDescription = wrtc.RTCSessionDescription;
//all connected to the server users 
var users = {};

var pc ;

//when a user connects to our sever 
wss.on('connection', function(connection) {

   console.log("User connected");

   //when server gets a message from a connected user
   connection.on('message', function(message) { 

      var data; 
      //accepting only JSON messages 
      try {
         data = JSON.parse(message); 
      } catch (e) { 
         console.log("Invalid JSON "+message); 
         data = {}; 
      } 

      //switching type of the user message 
      switch (data.type) { 
         //when a user tries to login 

         case "login": 
         console.log("User logged", data.name); 

            //if anyone is logged in with this username then refuse 
            if(users[data.name]) {
               sendTo(connection, {
                  type: "login", 
                  success: false 
               }); 
            } else { 
               //save user connection on the server 
               users[data.name] = connection; 
               connection.name = data.name; 

               sendTo(connection, { 
                  type: "login", 
                  success: true 
               }); 
            } 

            break; 

            case "offer": 
            //for ex. UserA wants to call UserB 
            console.log("Sending offer to: ", data.name); 

            //if UserB exists then send him offer details 
            var conn = users[data.name];

            if(conn != null) { 
               //setting that UserA connected with UserB 
               connection.otherName = data.name; 

               sendTo(conn, { 
                  type: "offer", 
                  offer: data.offer, 
                  name: connection.name 
               }); 
            } 

            break;  

            case "answer": 
            console.log("Sending answer to: ", data.name); 
            //for ex. UserB answers UserA 
            var conn = users[data.name]; 

            if(conn != null) { 
               connection.otherName = data.name; 
               sendTo(conn, { 
                  type: "answer", 
                  answer: data.answer 
               }); 
            } 

            break;  

            case "candidate":
            pc = new RTCPeerConnection({
               iceServers: [
               {
                urls: ['stun:stun.l.google.com:19302']
             }
             ]
          });
            pc.onicecandidate = function(candidate) {
               if (candidate.candidate) {
                 console.log(candidate.candidate.candidate);
                 if (candidate.candidate.candidate.indexOf('typ srflx') > -1) {
                   finish();
                }
             }
          };
/* 
             pc.onicegatheringstatechange = function() {
               if (pc.iceGatheringState === 'complete') {
                 finish();
               }
            };*/
            
            pc.createDataChannel('test');
            pc.createOffer().then(function(e) {
               pc.setLocalDescription(new RTCSessionDescription(e));
            });
            break;  

            case "leave": 
            console.log("Disconnecting from", data.name); 
            var conn = users[data.name]; 
            conn.otherName = null; 

            //notify the other user so he can disconnect his peer connection 
            if(conn != null) { 
               sendTo(conn, { 
                  type: "leave" 
               }); 
            }  

            break;  

            default: 
            sendTo(connection, { 
               type: "error", 
               message: message
            }); 

            break; 
         }  
      });  

   //when user exits, for example closes a browser window 
   //this may help if we are still in "offer","answer" or "candidate" state 
   connection.on("close", function() { 

      if(connection.name) { 
         delete users[connection.name]; 

         if(connection.otherName) { 
            console.log("Disconnecting from ", connection.otherName);
            var conn = users[connection.otherName]; 
            conn.otherName = null;  

            if(conn != null) { 
               sendTo(conn, { 
                  type: "leave" 
               });
            }  
         } 
      } 
   });  

   connection.send("Welcome Rishabh"); 

});  

function finish() {
   if (pc.signalingState === 'closed') {
     return;
  }
  pc.close();
}

function sendTo(connection, message) { 
   connection.send(JSON.stringify(message)); 
}
