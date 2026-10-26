# Philip Szczechowicz

**[Visit my website](https://philip1575.github.io/Main-Website/)**

Personal website with experience, projects, race results, and a training journal.

- [Races and results](https://philip1575.github.io/Main-Website/races.html): DC District Challenge, BellRinger, and the Marine Corps Marathon, with interactive course maps, elevation profiles, photos, and official results where available.
- [Training journal](https://philip1575.github.io/Main-Website/training.html): swimming, cycling, running, a daily activity calendar, and a sleep-score calendar.
- [BellRinger thank-you](https://philip1575.github.io/Main-Website/donor-recap.html): the shared donor recap and weekend highlights.
- A selected web résumé and [Garmin Data Exporter project](https://github.com/Philip1575/Garmin-Mass-Exporter-and-Daily-Sync).

## Preview locally

Run `python -m http.server 8000 --bind 127.0.0.1` in this folder and open http://127.0.0.1:8000/.

Built with HTML, CSS, and JavaScript. Bootstrap Icons attribution is included in `assets/`. Google supplies the optional map layer; the colored tracks are recorded event routes. Without a Maps key, local course diagrams remain available.

## Publishing

The Pages workflow deploys the public site from `main`. `GOOGLE_MAPS_API_KEY` is stored as a repository Actions secret and inserted into the deployment artifact. It is excluded from source control, but browser Maps keys are visible to site visitors. Configure website and API restrictions in Google Cloud. Demo keys have usage limits and are intended for prototyping; a standard key is recommended for production.

Activity and sleep snapshots are deliberately selected public exports. Credentials, raw Garmin archives, original GPX files, and local development notes are excluded. Training refreshes are prepared separately before publication; this repository does not authenticate to Garmin.
