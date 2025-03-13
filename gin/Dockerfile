# Build stage
FROM golang:latest AS builder

WORKDIR /src
COPY app/ .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/main .

# Copy the source code
COPY app/*.go ./

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Expose port
EXPOSE 3000
CMD ["/app/main"]