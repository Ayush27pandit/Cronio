package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port        string
	LogLevel    string
	DatabaseURL string
}

func LoadConfig() (*Config, error) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	//validate port number
	if _, err := strconv.Atoi(port); err != nil {
		return nil, fmt.Errorf("invalid PORT %q: %w", port, err)
	}
	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		logLevel = "info"
	}

	databaseURL := os.Getenv("DB_URL")
	if databaseURL == "" {
		return nil, fmt.Errorf("DB_URL environment variable is required")
	}
	return &Config{
		Port:        port,
		LogLevel:    logLevel,
		DatabaseURL: databaseURL,
	}, nil
}
