#!/usr/bin/env python3
"""Posts to X from the project account through the v2 API with OAuth 1.0a (stdlib only).

  xpost.py me                      show the authenticated account (no post)
  xpost.py post FILE               post FILE: blocks separated by lines starting with "=== " become a thread;
                                   a block line "IMAGE: /path.png" attaches that image to the block
  xpost.py queue                   post the first file of /home/admin/x-queue, move it to /home/admin/x-posted
Credentials: /home/admin/.x-api (API_KEY, API_SECRET, ACCESS_TOKEN, ACCESS_SECRET lines).
"""
import base64, hashlib, hmac, json, os, re, secrets, shutil, sys, time, urllib.parse, urllib.request, uuid

CRED = "/home/admin/.x-api"
QUEUE, POSTED, LOG = "/home/admin/x-queue", "/home/admin/x-posted", "/home/admin/x-posted/log.txt"

def creds():
    d = {}
    for line in open(CRED):
        if "=" in line:
            k, v = line.strip().split("=", 1); d[k.strip()] = v.strip()
    for k in ("API_KEY", "API_SECRET", "ACCESS_TOKEN", "ACCESS_SECRET"):
        if not d.get(k): sys.exit(f"missing {k} in {CRED}")
    return d

def enc(s): return urllib.parse.quote(str(s), safe="~-._")

def oauth_header(method, url, c, query=None):
    p = {"oauth_consumer_key": c["API_KEY"], "oauth_nonce": secrets.token_hex(16), "oauth_signature_method": "HMAC-SHA1",
         "oauth_timestamp": str(int(time.time())), "oauth_token": c["ACCESS_TOKEN"], "oauth_version": "1.0"}
    allp = dict(p); allp.update(query or {})
    base = "&".join([method.upper(), enc(url), enc("&".join(f"{enc(k)}={enc(v)}" for k, v in sorted(allp.items())))])
    key = f"{enc(c['API_SECRET'])}&{enc(c['ACCESS_SECRET'])}"
    p["oauth_signature"] = base64.b64encode(hmac.new(key.encode(), base.encode(), hashlib.sha1).digest()).decode()
    return "OAuth " + ", ".join(f'{enc(k)}="{enc(v)}"' for k, v in sorted(p.items()))

def request(method, url, c, body=None, content_type=None, query=None):
    full = url + ("?" + urllib.parse.urlencode(query) if query else "")
    req = urllib.request.Request(full, data=body, method=method)
    req.add_header("Authorization", oauth_header(method, url, c, query))
    if content_type: req.add_header("Content-Type", content_type)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

def upload_image(path, c):
    boundary = uuid.uuid4().hex
    data = open(path, "rb").read()
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"media\"; filename=\"{os.path.basename(path)}\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode() + data + f"\r\n--{boundary}--\r\n".encode()
    st, r = request("POST", "https://upload.twitter.com/1.1/media/upload.json", c, body, f"multipart/form-data; boundary={boundary}")
    if st not in (200, 201): sys.exit(f"media upload failed {st}: {r}")
    return r["media_id_string"]

def tweet(text, c, reply_to=None, media_id=None):
    payload = {"text": text}
    if reply_to: payload["reply"] = {"in_reply_to_tweet_id": reply_to}
    if media_id: payload["media"] = {"media_ids": [media_id]}
    st, r = request("POST", "https://api.x.com/2/tweets", c, json.dumps(payload).encode(), "application/json")
    if st not in (200, 201): sys.exit(f"post failed {st}: {r}")
    return r["data"]["id"]

def blocks(path):
    text = open(path, encoding="utf-8").read()
    parts = re.split(r"^=== .*$", text, flags=re.M)
    out = []
    for p in parts:
        p = p.strip()
        if not p or p.startswith("PINNED THREAD") or p.startswith("#"): continue
        img = None
        lines = []
        for line in p.splitlines():
            m = re.match(r"IMAGE:\s*(\S+)", line)
            if m: img = m.group(1)
            else: lines.append(line)
        body = "\n".join(lines).strip()
        if body: out.append((body, img))
    return out

def post_file(path, c):
    ids, prev = [], None
    for body, img in blocks(path):
        if len(body) > 280 and len(re.sub(r"\S+\.(com|org|io)\S*", "x" * 23, body)) > 280:
            sys.exit(f"block too long ({len(body)} chars): {body[:60]}")
        mid = upload_image(img, c) if img else None
        prev = tweet(body, c, reply_to=prev, media_id=mid)
        ids.append(prev); print("posted", prev); time.sleep(2)
    return ids

def main():
    c = creds()
    cmd = sys.argv[1] if len(sys.argv) > 1 else "me"
    if cmd == "me":
        st, r = request("GET", "https://api.x.com/2/users/me", c)
        print(st, r); return
    if cmd == "post":
        ids = post_file(sys.argv[2], c)
        print("first post: https://x.com/trenchampions/status/" + ids[0]); return
    if cmd == "queue":
        os.makedirs(QUEUE, exist_ok=True); os.makedirs(POSTED, exist_ok=True)
        files = sorted(f for f in os.listdir(QUEUE) if f.endswith(".txt"))
        if not files: print("queue empty"); return
        f = files[0]; ids = post_file(os.path.join(QUEUE, f), c)
        shutil.move(os.path.join(QUEUE, f), os.path.join(POSTED, f))
        with open(LOG, "a") as log: log.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} {f} {' '.join(ids)}\n")
        print("done", f); return
    sys.exit(__doc__)

if __name__ == "__main__":
    main()
