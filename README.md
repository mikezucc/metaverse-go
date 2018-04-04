# metaverse-go
Multiplayer metaverse rendered using A-Frame. Hosting and multiplayer through Socket.io, WebRTC, and HTTP Go server.

## Install

1. Install go
2. Set $GOPATH appropriately, (this directory)
3. (Optional, this comes preinstalled with the repository) Install submodule `go-socket.io` via instructions here https://github.com/googollee/go-socket.io

## Run

There are two servers, one for serving static files and one for communicating through to clients via Go

Static file server (Metaverse Main World)
1. go run scklogserver.go => Listening on `:3002`

Socket io server (Metaverse data exchange protocol)
1. go run socket.go => Listening on `:3004`

Connect to it by opening separate browser windows: http://localhost:3002/worlds/main.html

Note!: A-Frame and Three JS are massive, so it takes a while for the browser to load in, meanwhile your player may have fallen through the ground plane. If that happens, just refresh the page until it lands safely. You should allow your webcam to be able to send compressed images acting as your avatar to the other players. It's not saved anywhere dont worry.

Note on the Pepe frog icon: That is a button to activate WebRTC VOIP through WebRTC-V2 with PubNub's sponsored repository. It does not work on non-HTTPS as far as I can remember. I have rewritten this particular app in several different stacks, so I don't remember anymore. You can create a self signed cert and serve that over https server and change the `app.js` => `k_SOCKET_ENDPOINT_PUBLIC_OSIRIS` to use `wss://` instead of `ws://`

Note, I had to ban XHR-polling as an available protocol for Socket io as we are running two separate servers and there is shoddy XHR support for CORS in socket io libs.
