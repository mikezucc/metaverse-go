package main

import (
	"log"
	"net/http"
	"time"
	"fmt"

	"github.com/googollee/go-socket.io"
)

func main() {
	/**
	Metaverse Base worlds
	*/
	type BaseWorlds struct {
		main string
	}
	worlds := BaseWorlds{"main"}
	/**
	Metaverse Base worlds
	*/

	/**

	SOCKET.IO GO

	*/
	server, err := socketio.NewServer(nil)
	if err != nil {
		log.Fatal(err)
	}

	/**
	Periodic server datagram broadcast to all active clients on server

	Notes: Traditional javascript usage passes around either an array or a dictionary
	This type was allowed to compile when trying with original Javascripty paradigm
		`map[string]interface{}``
	However, the example socket.io Go interface was not meant to pass around these simplicit
	objects as far as I can tell, and Im not trying to strong arm this verbose,
	opinionated language to work like it aint. So for now, client and server both
	agree to pass around strings containing JSON formatted text. Now ain't that funny.

	Further Notes: Socket.io-p2p actually uses strings as its interchange format
	so in anycase, this is the most flexible solution. However, socket io Swift
	uses Arrays ??? github.com/Nuclearace is one crafty boi
	*/
	var datagramQueue []string
	ticker := time.NewTicker(200 * time.Millisecond)
	go func() {
			for _ = range ticker.C {
				fmt.Print("x")
				finalString := "["
				for index, gram := range datagramQueue {
					if index > 0 {
						finalString += ","
					}
					finalString += gram
				}
				finalString += "]"
				server.BroadcastTo(worlds.main, "avatar-datagram", finalString)
				datagramQueue = []string{}
			}
	}()
	/**
	Periodic server datagram broadcast to all active clients on server
	*/

	numConnectedClients := 0
	server.On("connection", func(so socketio.Socket) {
		numConnectedClients += 1
		fmt.Printf("[SOCKETIO] \x1b[33m %g \x1b[0m" + " peers online -- \x1b[1mCONNECT!\x1b[0m: %s", numConnectedClients, so.Id())

		so.Join(worlds.main)
		/**
		Handshake with Metaverse centralized
		*/
		identityMap := make(map[string]interface{})
		identityMap["socketid"] = so.Id()
		so.Emit("server-ack-connect", identityMap)

		so.On("avatar-phone-advertise", func(data string) {
			so.BroadcastTo(worlds.main, "server-ack-connect", data)
		})

		so.On("start-stream", func(data string) {
			so.BroadcastTo(worlds.main, "start-stream", data)
		})

		so.On("avatar-face", func(data string) {
			so.BroadcastTo(worlds.main, "avatar-face", data)
		})

		so.On("avatar-datagram", func(data string) {
			datagramQueue = append(datagramQueue, data);
		})

		/**
		Default Socket.io callbacks
		*/
		so.On("disconnection", func() {
			numConnectedClients -= 1
			log.Println("on disconnect")
		})
		/**
		Default Socket.io callbacks
		*/

	})
	server.On("error", func(so socketio.Socket, err error) {
		log.Println("[SOCKETIO] error:", err)
	})

	http.Handle("/socket.io/", server)
	http.Handle("/", http.FileServer(http.Dir("./asset")))
	log.Println("[SOCKETIO] Serving at localhost:3003...")
	log.Fatal(http.ListenAndServe(":3003", nil))
	/**

	SOCKET.IO GO

	*/
}
