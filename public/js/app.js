window.onload = function() {
  // intended to create rooms based on current IPFS file identifier
  var hrefPathComponents = window.location.pathname.split('/');
  var currentBlock = hrefPathComponents.indexOf("ipfs") != -1 ? hrefPathComponents[hrefPathComponents.indexOf("ipfs")+1] : "city_center";

  // for use with example WebRTC via https://github.com/stephenlb/webrtc-sdk
  // used for VOIP because its novel
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  var audioCtx = new AudioContext();
  
  var k_SOCKET_ENDPOINT_PUBLIC_OSIRIS = "ws://" + window.location.hostname + ':3003';
  // IMPORTANT! In order to support CORS, we ban XHR polling
  // https://github.com/socketio/socket.io-client/issues/641
  /**
  Issue for me, as well. I want to emit immediately after connection, which is before the transport is upgraded from XHR Polling.
  Instructing the client to use the "websocket" transport first might help mitigate the issue, but it still won't help users in browsers that don't support websockets.
  var socket = io('http://localhost', {transports: ['websocket', 'polling', 'flashsocket']});
  engine.io-client XHR transport really needs CORS support.
  **/
  var socket = io(k_SOCKET_ENDPOINT_PUBLIC_OSIRIS, {transports: ['websocket', 'polling', 'flashsocket']})

  // Avatar connected to Swarm! Initiate its additional phone peer in other VOIP swarm
  socket.on("server-ack-connect", function (data) {
    console.log("[SOCKET.IO] > server ack > ");
    console.log(data);
    startPhoneSession(data["socket_id"]);
  })

  // Initiate VOIP with avatars in same block
  socket.on("avatar-phone-advertise", function (data) {
    console.log("[SOCKET.IO] > avatar phone advertise > ");
    var socketid = data['socketid'];
    openVOIPConnection(socketid);
  })

  socket.on('avatar-disconnect', function(info) {
    var peerid = info["socket_id"];
    console.log("LEFT >> " + peerid );
    var peerBox = document.getElementById('box' + peerid);
    if (peerBox) {
      var position = peerBox.getAttribute('position');
      var rotation = peerBox.getAttribute('rotation');
      position.y = 3;
      for (var i = 0; i < 4; i++) {
        showQuadDialog(position, rotation, "AVATAR DISCONNECTED");
      }
    }

    if (peerBox) {
      document.querySelector('a-scene').removeChild(peerBox);
    }
    var peerHat = document.getElementById('hat' + peerid);
    if (peerHat) {
      document.querySelector('a-scene').removeChild(peerHat);
    }

    var peerChat = document.getElementById('speech' + peerid);
    if (peerChat) {
      document.querySelector('a-scene').removeChild(peerChat);
    }

    var peerSombro = document.getElementById('sombro' + peerid);
    if (peerSombro) {
      document.querySelector('a-scene').removeChild(peerSombro);
    }
  })

  socket.on('worldPopulation', function(data){
    console.log("world population");
    console.log(data);
    var populationString = "";
    for (var world in data) {
      if (data.hasOwnProperty(world)) {
        var popString = data[world].toString();
        console.log("population for " + world + " is " + popString);
        populationString += (world + " (" + popString + " versers) -");
      }
    }
    document.getElementById('speechoutput').innerHTML = populationString;
  })

  socket.on('avatar-datagram', function (datagram) {
    var json = JSON.parse(datagram);
    for (var reportedAvatarMetadata in json) {
      console.log(reportedAvatarMetadata);
      var metadata = json[reportedAvatarMetadata];
      var peerid = metadata["socket_id"];
      processDataGram(peerid, metadata);

      updateWithRandomFace(peerid);
    }
  })

  socket.on('avatar-face', function (data) {
    var parsed = JSON.parse(data);
    var peerid = parsed["socket_id"];
    processAvatarFace(peerid, parsed);
  })

  // see github.com/mikezucc/metaverse-ipfs
  // ipfs.once('ready', () => ipfs.id((err, info) => {
  // }))
  //
  // function repo() {
  //   return 'ipfs/pubsub-demo/' + Math.random()
  // }

  // Non-https/ avatar chooses to not broadcast webcam
  function updateWithRandomFace(peerid) {
    // var rando = Math.floor(Math.random() * 10) % 5;
    // var imageBuffer;
    // if (rando == 0) {
    //   imageBuffer = "";
    // } else if (rando == 1) {
    //   imageBuffer = "";
    // } else if (rando == 2) {
    //   imageBuffer = "";
    // } else if (rando == 3) {
    //   imageBuffer = "";
    // } else if (rando == 4) {
    //   imageBuffer = "";
    // }
    // var peerBox;
    // if (document.getElementById('box' + peerid)) {
    //   peerBox = document.getElementById('box' + peerid);
    // } else {
    //   if (document.getElementById('sombro' + peerid) == null) {
    //     return;
    //   }
    //   peerBox = document.createElement('a-box');
    //   peerBox.id = 'box' + peerid;
    //   document.querySelector('a-scene').appendChild(peerBox);
    // }
    //
    // var img = new Image();
    // img.src = imageBuffer;
    // context.drawImage(img, 0, 0, 256, 256);
    // var img = document.querySelector('img');
    // img.setAttribute('src', imageBuffer);
    // peerBox.setAttribute('material', 'src', 'url(' + imageBuffer + ')');
  }

  // Avatar media metadata updates
  function processAvatarFace(peerid, datagram) {
    var imageBuffer = datagram['imagebuffer'];
    console.log("avatar face received" + imageBuffer);
    var peerBox;
    if (document.getElementById('box' + peerid)) {
      peerBox = document.getElementById('box' + peerid);
    } else {
      if (document.getElementById('sombro' + peerid) == null) {
        return;
      }
      peerBox = document.createElement('a-box');
      peerBox.id = 'box' + peerid;
      document.querySelector('a-scene').appendChild(peerBox);
    }

    var img = new Image();
    img.src = imageBuffer;
    context.drawImage(img, 0, 0, 256, 256);
    var img = document.querySelector('img');
    img.setAttribute('src', imageBuffer);
    peerBox.setAttribute('material', 'src', 'url(' + imageBuffer + ')');
  }

  // Avatar positional adata updates
  function processDataGram(peerid, info) {
    if ((peerid == null) || (peerid === "") || ("undefined" === typeof peerid)) {
      console.log("[PROCESS DATAGRAM] EMPTY PEER ID");
       return
    }
    if (peerid === socket.id) {
      console.log("[PROCESS DATAGRAM] SAME SOCKET DGQ");
      return
    }
    var position = info['position'];
    var rotation = info['rotation'];

    // All the components that compose an "avatar"
    // "Templates" of the non-primitives must exist as top level leaves in `a-scene`
    var peerBox;
    var peerHat;
    var peerChat;
    var peerSombro;
    var peerLight;

    if (document.getElementById('hat' + peerid)) {
      peerBox = document.getElementById('box' + peerid);
      peerHat = document.getElementById('hat' + peerid);
      peerChat = document.getElementById('speech' + peerid);
      peerSombro = document.getElementById('sombro' + peerid);
    } else {
      peerBox = document.createElement('a-box');
      peerHat = document.createElement('a-cone');
      peerChat = document.createElement('a-entity');
      peerSombro = document.getElementById('starterbrero').cloneNode(true);
      peerBox.id = 'box' + peerid;
      peerHat.id = 'hat' + peerid;
      peerChat.id = 'speech' + peerid;
      peerSombro.id = 'sombro' + peerid;
      peerBox.setAttribute('lerp', {"duration":200});
      peerBox.appendChild(peerSombro);
      peerHat.setAttribute('scale', "0.4 0.4 0.4");
      peerSombro.setAttribute('position', {"x": 0, "y": 0.35, "z":0});
      peerSombro.setAttribute('rotation', {"x": 0, "y": 0, "z":0});
      document.querySelector('a-scene').appendChild(peerBox);
      document.querySelector('a-scene').appendChild(peerHat);
      document.querySelector('a-scene').appendChild(peerChat);

      var imageBuffer = "data:image/jpeg;base64,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";
      peerBox.setAttribute('material', 'src', 'url(' + imageBuffer + ')');
    }


    var lastIcos = peerBox;
    var hatPos = position;

    peerBox.setAttribute('position', position);
    peerBox.setAttribute('rotation', rotation);

    hatPos.y += 2;
    peerHat.setAttribute('position', hatPos);
    peerHat.setAttribute('color', getRandomColor());

    hatPos.y -=2.5;
    peerChat.setAttribute('position', hatPos);
    peerChat.setAttribute('rotation', rotation);
  }

  /**
   Binding DOM for video canvas capture for avatar texture
  */
  // one time dispatch to begin video stream
  var startButton = document.getElementById('start-stream')
  var video = document.querySelector("video");
  var videoWidth;
  var videoHeight;
  // used for grabbing video feed and compressing image for pubsub delivery
  var canvas = document.createElement("canvas");
  var canvasReceived = document.createElement("canvas");
  // these dimensions must be 2 power or else html canvas throws AN ABSOLUTE FIT
  canvas.width = 256;
  canvas.height = 256;
  var context = canvas.getContext("2d");
  var contextReceived = canvasReceived.getContext("2d");
  document.querySelector('body').appendChild(canvas);
  document.querySelector('body').appendChild(canvasReceived);

  // deprecated, used to visually signal new messages from peers
  // now it just uses the weird ass eye thing
  function getRandomColor() {
      var letters = '3FCDEF';
      var color = '#';
      for (var i = 0; i < 6; i++ ) {
          color += letters[Math.floor(Math.random() * 5)];
      }
      return color;
  }

  /**
    When an avatar disconnects, we show this dialog above their last known
    position
  */
  function showQuadDialog(position, rotation, text) {
    var otherHalf = document.createElement('a-entity');
    otherHalf.setAttribute('geometry', 'primitive', 'plane');
    otherHalf.setAttribute('material', 'color', 'blue');
    otherHalf.setAttribute('material', 'height', 'auto');
    otherHalf.setAttribute('material', 'width', 'auto');
    otherHalf.setAttribute('text', 'font', 'mozillavr');
    otherHalf.setAttribute('text', 'color', 'black');
    otherHalf.setAttribute('text', 'width', '6');
    otherHalf.setAttribute('text', 'value', text);
    otherHalf.setAttribute('position', position);
    rotation.y += 90;
    otherHalf.setAttribute('rotation', {"x":rotation.x,"y":rotation.y,"z":rotation.z});
    document.querySelector('a-scene').appendChild(otherHalf);
  }

  /**
    VOIP! requires ssl
  */
  var phone;
  var phoneReady = false;
  document.getElementById('micimage').setAttribute('src', '/assets/micbuttonoff.png');
  function startPhoneSession(my_peer_id) {
    console.log("phone sesh with " + my_peer_id);
    phone = PHONE({
        number        : my_peer_id,
        publish_key   : 'pub-c-0258682c-c8c5-42c0-9fe9-990b0741f2b7',
        subscribe_key : 'sub-c-255dc204-4b55-11e7-ab90-02ee2ddab7fe',
        media         : { audio : true, video : false },
        ssl           : true
    })

    phone.unable(function(details){
      console.log("Phone is unable to initialize.");
      console.log("Try reloading, or give up lmao.");
      console.log(details);
      document.getElementById('micimage').setAttribute('src', 'assets/micbuttonoff.png');
    });

    phone.debug(function(details){
      console.log("phone debug");
      console.log(details);
    });
    // As soon as the phone is ready we can make calls
    phone.ready(function(){
      console.log("phone ready with number " + phone.number());
        phoneReady = true;
        document.getElementById('micimage').setAttribute('src', 'assets/micbuttonon.png');
        socket.emit("avatar-phone-advertise", JSON.stringify({"socketid":socket.id}))
        // Dial a Number and get the Call Session
        // For simplicity the phone number is the same for both caller/receiver.
        // you should use different phone numbers for each user.
    });

    // When Call Comes In or is to be Connected
    phone.receive(function(session){
      console.log("phone receive");
        // Display Your Friend's Live Video
        session.connected(function(session){
          console.log("video receive");
            document.querySelector('body').appendChild(session.video);
        });
    });
  }

  function openVOIPConnection(socketid) {
    if (phone == null) { return; }
    if (phoneReady == false) { return; }

    console.log("CALLING " + socketid);
    var session = phone.dial(socketid);
  }

  /**
  Client generating positional updates via tick
  */
  var lastPosition = "";
  var lastRotation = "";
  var datagramInterval = setInterval(function() {
      if ((socket == null) || ("undefined" === typeof socket)) {
        console.log("SOCKET NOT CONNECTED >> no datagram broadcast");
        return;
      }
      // console.log("scheduling datagram push");
      var camera = document.getElementById('camera');
      var position = camera.getAttribute('position');
      var rotation = camera.getAttribute('rotation');
      if ((position === lastPosition) || (rotation == lastRotation)) {
          return;
      }
      // console.log(position);
      lastRotation = rotation;
      lastPosition = position;
      socket.emit("avatar-datagram", JSON.stringify({ "socket_id": socket.id, 'type':'dg', 'position': position, 'rotation':rotation }));
      if (position.x < 0) {
        position.x = -position.x;
      }
      if (position.z < 0) {
        position.z = -position.z;
      }
      document.getElementById("currentBlockCoord").innerHTML = "currently in block x: " + Math.floor(position.x/37.5).toString() + " ~ z: " + Math.floor(position.z/37.5).toString();
  }, 300);

  // Creates an avatar texture capture context by grabbing audio from
  // the web cam. This isn't necessary for broadcasting datagram updates.
  function startStream () {
    startButton.setAttribute('disabled', true)
    video.addEventListener('canplay', function() {
          videoWidth = video.videoWidth;
          videoHeight = video.videoHeight;
          var duration = video.duration;
          var i = 0;

          var interval = setInterval(function() {
            if ((socket == null) || ("undefined" === typeof socket)) {
              console.log("ROOM NOT CONNECTED >> no avatar broadcast");
              return;
            }
            context.drawImage(video, 0, 0, 256, 256);
            var dataURL = canvas.toDataURL('image/jpeg', 0.1);
            // console.log("created avatar face with " + dataURL);
            socket.emit("avatar-face", JSON.stringify( {"socket_id": socket.id, 'type':'avatar-face', 'imagebuffer': dataURL} ) );
        }, 300);
    });
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;
    if (navigator.getUserMedia) {
      navigator.getUserMedia({audio: true, video: { width: 320, height: 240}}, handleVideo, videoError);
    }
    function handleVideo(stream) {
      var video = document.querySelector("video");
      video.src = window.URL.createObjectURL(stream);
      video.volume = 0;
    }
    function videoError(e) {console.log(e);}

    // Usually, this would use PubNub Phone WebRTC to do VOIP,
    // This is also availabel as a support mechanism
    document.getElementById('echobutton').addEventListener('click',function() { window.open('https://discord.gg/3j7XYqY','_blank'); });
  }

  // Honestly, A-Frame physics community is a mess, it took me days to get something
  // not ridiculous going. This basically works by setting gravity to zero and
  // then setting the player vertical velocity to 5 u/s, whose position is
  // broadcast to the others. Then a timer brings back gravity.
  var shouldBeJumping = false;
  var floatValue = 0; // 100 tick
  function keydown(e) {
    var event = window.event ? window.event : e;
    if (event.keyCode == 32) {
      var el = document.querySelector('a-scene');
      // el.setAttribute('physics-world', {"gravity":{"x":0, "y":1.2, "z":0}});
      el.systems.physics.world.gravity.set(0, 0, 0);
      shouldBeJumping = true;
      floatValue = 10; // oversized population of ticks
      var jumpEnd = setTimeout(function() {
        shouldBeJumping = false;
      }, 1000);
      var meme = setTimeout(function() {
        var el = document.querySelector('a-scene');
        // el.setAttribute('physics-world', {"gravity":{"x":0, "y":1.2, "z":0}});
        el.systems.physics.world.gravity.set(0, -4.9, 0);
      }, 1000);
      var velocity = document.getElementById('camera').getAttribute('velocity');
      velocity.y = 5;
      camera.setAttribute('velocity', velocity);
    }
  }
  document.addEventListener("keydown", keydown);

  // KEY FOR IGNITION, HOLD FAST
  startStream()
}
