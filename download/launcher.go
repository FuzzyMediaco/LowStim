// LowStim's downloadable edition serves the shared slate on a stable loopback origin.
package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const address = "127.0.0.1:41731"
const home = "http://" + address
const accountOrigin = "https://lowstim.fuzzymedia.workers.dev"

func openBrowser() {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", home)
	case "darwin":
		cmd = exec.Command("open", home)
	default:
		cmd = exec.Command("xdg-open", home)
	}
	if err := cmd.Start(); err == nil {
		go cmd.Wait()
	}
}

func main() {
	binary, err := os.Executable()
	if err != nil {
		log.Fatal(err)
	}
	slate := filepath.Join(filepath.Dir(binary), "slate")
	if _, err = os.Stat(filepath.Join(slate, "index.html")); err != nil {
		log.Fatal("Extract the full LowStim folder before opening the launcher.")
	}
	remote, _ := url.Parse(accountOrigin)
	proxy := &httputil.ReverseProxy{
		Rewrite: func(ctx *httputil.ProxyRequest) {
			ctx.SetURL(remote)
			ctx.Out.Host = remote.Host
			ctx.Out.Header.Set("Origin", accountOrigin)
			ctx.Out.Header.Del("Referer")
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			fmt.Fprint(w, `{"error":"Connect to the internet to sign in."}`)
		},
	}
	files := http.FileServer(http.Dir(slate))
	server := &http.Server{ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 30 * time.Second, Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Host != address {
			http.Error(w, "Local access only", 403)
			return
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cross-Origin-Opener-Policy", "same-origin")
		w.Header().Set("Cross-Origin-Embedder-Policy", "require-corp")
		if strings.HasPrefix(r.URL.Path, "/api/") {
			// Downloaded creations stay on the device. Only account authentication is proxied.
			if r.URL.Path != "/api/login" && r.URL.Path != "/api/register" && r.URL.Path != "/api/status" && r.URL.Path != "/api/logout" {
				http.NotFound(w, r)
				return
			}
			if r.Method != "GET" && (r.Method != "POST" || r.Header.Get("Origin") != home) {
				http.Error(w, "Invalid origin", 403)
				return
			}
			if r.Header.Get("Sec-Fetch-Site") == "cross-site" {
				http.Error(w, "Invalid origin", 403)
				return
			}
			proxy.ServeHTTP(w, r)
			return
		}
		if r.Method != "GET" && r.Method != "HEAD" {
			http.Error(w, "Unavailable method", 405)
			return
		}
		files.ServeHTTP(w, r)
	})}
	listener, err := net.Listen("tcp4", address)
	if err != nil {
		log.Fatal("Could not start LowStim. If already running, open " + home)
	}
	fmt.Println("LowStim is running at " + home + ". Close this window to stop.")
	openBrowser()
	log.Fatal(server.Serve(listener))
}
