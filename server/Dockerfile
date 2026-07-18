# ─────────────────────────────────────────────────────────────────
# IMPORTANT: This Dockerfile must be built from the REPO ROOT, not
# from inside server/. That's because it needs to copy BOTH the
# server/ folder AND the engine/ folder (which lives one level up
# from server/) into the image. The build command is:
#
#   docker build -f server/Dockerfile -t chess-server .
#
# Breaking that command down:
#   -f server/Dockerfile   -> "use this file as the recipe"
#   -t chess-server        -> "tag/name the resulting image chess-server"
#   .                       -> "use the current folder (repo root) as
#                              the build context" (this is what lets
#                              COPY reach both server/ and engine/)
# ─────────────────────────────────────────────────────────────────

# Start from an official Node.js 20 image. "slim" is a smaller version
# of the image (less bloat) but still has apt-get available, which we
# need to install a C++ compiler in the next step.
FROM node:20-slim

# RUN executes a shell command INSIDE the image while it's being built.
# apt-get update    -> refreshes the list of installable packages
# apt-get install   -> installs the g++ compiler (needed to build the
#                      chess engine from .cpp source files)
# -y                -> auto-confirm the install (no interactive prompt)
# --no-install-recommends -> skip optional extra packages, keeps image smaller
# && rm -rf /var/lib/apt/lists/*  -> deletes the downloaded package
#                      index after install, to keep the final image
#                      smaller (this file is only needed during install)
RUN apt-get update && apt-get install -y --no-install-recommends g++ \
    && rm -rf /var/lib/apt/lists/*

# WORKDIR sets the "current folder" inside the image for all commands
# that follow, similar to running `cd /` in a terminal.
# We use "/" as the base so engine/ and server/ become SIBLING folders
# inside the container - this matches what bridge.js and build-engine.js
# expect: they both compute the engine's path as "../../engine" relative
# to themselves, which only resolves correctly if engine/ and server/
# sit right next to each other (both directly under the same parent),
# same as they do in your actual repo.
WORKDIR /

# COPY <source on your computer> <destination inside the image>
# Copies your local engine/ folder (with the .cpp source files) into
# the image at /engine
COPY engine ./engine

# Copies your local server/ folder into the image at /server
# (this includes bridge.js, package.json, index.js, everything)
# NOTE: this is /server, a sibling of /engine - NOT /app/server.
# That "app" nesting was the bug that broke the engine build earlier:
# it made "../../engine" resolve to a folder that never existed.
COPY server ./server

# Switch the "current folder" inside the image to /server, so the
# next commands (npm install, node index.js) run from the right place -
# just like `cd server` in a terminal.
WORKDIR /server

# Installs all the npm packages listed in server/package.json.
# --omit=dev skips devDependencies (like nodemon) since we don't need
# a dev-only auto-restart tool in production.
# IMPORTANT: this also automatically triggers the "postinstall" script
# in package.json, which runs build-engine.js and compiles the C++
# engine into a Linux binary right here, inside the container.
RUN npm install --omit=dev

# Documents that this container listens on port 3000 (matches your
# server's default PORT). This line is informational only - it doesn't
# actually publish the port; that happens with `docker run -p`.
EXPOSE 3000

# The command that runs when a container is STARTED from this image
# (as opposed to RUN, which only runs during the BUILD).
# This is equivalent to running `node index.js` in a terminal.
CMD ["node", "index.js"]