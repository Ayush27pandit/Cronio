package main

import (
	"log"

	"github.com/Ayush27pandit/Cronio/server/internal/config"
	"github.com/Ayush27pandit/Cronio/server/internal/server"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	srv := server.New(cfg.Port)
	log.Printf("Cronio server listening on Port:%s", cfg.Port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server: %v", err)
	}

}
