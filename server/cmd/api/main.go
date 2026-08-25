package main

import (
	"log"

	"github.com/Ayush27pandit/Cronio/server/internal/config"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	log.Printf("Cronio Server starting on port %s", cfg.Port)

}
