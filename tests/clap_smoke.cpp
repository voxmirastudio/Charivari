// Charivari — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — GNU GPL, version 3 or later (LICENSE)
// A small CLAP host for the builds (Linux, Windows, macOS): loads Charivari.clap, reads its descriptor, parameters and ports,
// activates it, plays 400 blocks of 256 frames with a note on every output port, and checks that every sample is finite.
// It opens no window. Exit code 0 when everything holds.
#include <clap/clap.h>
#include <cstdio>
#include <cstring>
#include <cmath>
#include <vector>
#ifdef _WIN32
 #include <windows.h>
 static void* openLib (const char* p) { return (void*) LoadLibraryA (p); }
 static void* sym (void* h, const char* n) { return (void*) GetProcAddress ((HMODULE) h, n); }
#else
 #include <dlfcn.h>
 static void* openLib (const char* p) { return dlopen (p, RTLD_NOW | RTLD_LOCAL); }
 static void* sym (void* h, const char* n) { return dlsym (h, n); }
#endif
static const void* getExt (const clap_host*, const char*) { return nullptr; }
static void noop (const clap_host*) {}
struct Events { std::vector<clap_event_note> notes; };
static uint32_t inSize (const clap_input_events* l) { return (uint32_t) ((Events*) l->ctx)->notes.size(); }
static const clap_event_header* inGet (const clap_input_events* l, uint32_t i) { return &((Events*) l->ctx)->notes[i].header; }
static bool outPush (const clap_output_events*, const clap_event_header*) { return true; }
int main (int argc, char** argv)
{
    if (argc < 2) { printf ("usage: clap_smoke Charivari.clap\n"); return 2; }
    void* h = openLib (argv[1]); if (! h) { printf ("FAIL: cannot load %s\n", argv[1]); return 1; }
    auto entry = (const clap_plugin_entry*) sym (h, "clap_entry"); if (! entry) { printf ("FAIL: no clap_entry\n"); return 1; }
    if (! entry->init (argv[1])) { printf ("FAIL: entry init\n"); return 1; }
    auto fac = (const clap_plugin_factory*) entry->get_factory (CLAP_PLUGIN_FACTORY_ID);
    if (! fac || fac->get_plugin_count (fac) < 1) { printf ("FAIL: no plugin\n"); return 1; }
    auto d = fac->get_plugin_descriptor (fac, 0);
    printf ("%s | %s | %s | version %s\n", d->id, d->name, d->vendor, d->version);
    clap_host host { CLAP_VERSION, nullptr, "clap_smoke", "Vox Mira Studio", "", "1", getExt, noop, noop, noop };
    auto p = fac->create_plugin (fac, &host, d->id);
    if (! p || ! p->init (p)) { printf ("FAIL: create / init\n"); return 1; }
    auto params = (const clap_plugin_params*) p->get_extension (p, CLAP_EXT_PARAMS);
    auto ap = (const clap_plugin_audio_ports*) p->get_extension (p, CLAP_EXT_AUDIO_PORTS);
    unsigned nParams = params ? params->count (p) : 0, nOut = ap ? ap->count (p, false) : 0;
    printf ("parameters %u, output ports %u, gui %s\n", nParams, nOut, p->get_extension (p, CLAP_EXT_GUI) ? "yes" : "no");
    if (! p->activate (p, 48000.0, 32, 256)) { printf ("FAIL: activate\n"); return 1; }
    p->start_processing (p);
    const uint32_t N = 256; std::vector<std::vector<float>> buf (nOut * 2, std::vector<float> (N));
    std::vector<float*> ptrs (nOut * 2); std::vector<clap_audio_buffer> outs (nOut);
    for (unsigned o = 0; o < nOut; ++o) { ptrs[o * 2] = buf[o * 2].data(); ptrs[o * 2 + 1] = buf[o * 2 + 1].data(); outs[o] = { ptrs.data() + o * 2, nullptr, 2, 0, 0 }; }
    Events ev; clap_input_events in { &ev, inSize, inGet }; clap_output_events out { nullptr, outPush };
    bool finite = true; double peak = 0;
    for (int b = 0; b < 400; ++b) {
        ev.notes.clear();
        if (b == 10 || b == 200) { clap_event_note n {}; n.header = { sizeof (clap_event_note), 0, CLAP_CORE_EVENT_SPACE_ID, b == 10 ? (uint16_t) CLAP_EVENT_NOTE_ON : (uint16_t) CLAP_EVENT_NOTE_OFF, 0 }; n.note_id = -1; n.port_index = 0; n.channel = 0; n.key = 35; n.velocity = 0.8; ev.notes.push_back (n); }
        clap_process pr {}; pr.steady_time = (int64_t) b * N; pr.frames_count = N; pr.audio_outputs = outs.data(); pr.audio_outputs_count = nOut; pr.in_events = &in; pr.out_events = &out;
        p->process (p, &pr);
        for (auto& c : buf) for (float x : c) { if (! std::isfinite (x)) finite = false; peak = std::fmax (peak, std::fabs (x)); }
    }
    p->stop_processing (p); p->deactivate (p); p->destroy (p); entry->deinit ();
    printf ("400 blocks played: every sample finite %s, peak %.4f\n", finite ? "yes" : "NO", peak);
    bool ok = finite && nParams == 48 && nOut == 16;
    printf ("%s\n", ok ? "OK" : "FAIL: expected 48 parameters, 16 output ports and finite samples");
    return ok ? 0 : 1;
}
