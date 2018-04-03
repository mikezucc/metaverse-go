package main

import (
	"log"
	"net/http"
)

func main() {
	/**

	STATIC FILE SERVER

	*/
	fs := http.FileServer(http.Dir("public"))
  http.Handle("/worlds/", fs)
	http.Handle("/assets/", fs)
	http.Handle("/js/", fs)
	http.Handle("/", fs)

	log.Println("File server is active on :3002")
  http.ListenAndServe(":3002", nil)
	/**

	STATIC FILE SERVER

	*/
}
