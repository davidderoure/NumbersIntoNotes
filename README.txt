Numbers Into Notes

Interactive JavaScript demo for the Ada Lovelace Symposium held in
Oxford in December 2015, in which number sequences are converted
into notes.

Originally designed as a standalone demo to run on a laptop attached
to a large display, this software is now also available online. It
has been developed and tested in Chrome on a Mac, and also tested
in Firefox (and it runs on chrome on android but is not designed
to be without a mouse).

The three main modes of running this single page web application
are described below.

Online on the Web

Normal use.  The URL to the current test server is

http://demeter.oerc.ox.ac.uk/NumbersIntoNotes/

and this provides full interactive functionality (the interactive
HTML/Javascript document) plus notation, MIDI file generation, and
provenance graph generation (via CGI).

NB Once you have loaded and run NumbersIntoNotes online it will
continue to run in your browser offline, but the notation, MIDI,
and provenance buttons in the export section will disappear (also
avoid clicking on links in the text to wikipedia, oeis etc). Audio
will continue to work as long as the soundfonts have been cached.
Saving the page from the browser in Chrome will provide a local
version that runs fresh but you will lose the fonts as these are
not saved (so some buttons lose their labels).

Download the zip file

To preload a backup onto a laptop for talks (or obtain a copy to
edit as you wish). Download and unzip NiN.zip then click on
NumbersIntoNotes.html

http://demeter.oerc.ox.ac.uk/NumbersIntoNotes/NiN.zip

The notation and MIDI buttons will not appear. Run it online to
load the soundfonts. The benefit of this version is you know you
have it preloaded and can demo independent of access to the server.

Standalone using a local web server on your laptop

This can provide full functionality without being online but requires
advanced setup.  Download the distribution from github and install
it to be served from your host. This will immediately run as with
the zip file above but from localhost; e.g.

http://localhost/~dave/NumbersIntoNotes.html

There are four optional steps for additional functionality:

1. Edit the NumbersIntoNotes.js file to load the sound fonts locally
from the sf directory (search for Soundfont). You can then run
offline.

2. For notation support, install Lilypond on your machine (
http://www.lilypond.org/ ), create a pdf directory (where PDFs and
logs will be kept), and install the cgi-bin/lily script according
to your server configuration, editing the hard paths in the script
accordingly. Also edit the POST action in NumbersIntoNotes.html to
call your CGI script.

3. For MIDI support, install midicsv on your machine (
http://www.fourmilab.ch/webtools/midicsv/ ), create a midi directory
on the server (where MIDI files and logs will be kept), and install
the cgi-bin/csvmidi script according to your server configuration,
editing the hard paths in the script accordingly. Also edit the
POST action in NumbersIntoNotes.html to call your CGI script.

4. For PROV support, install provconvert on your machine (
https://github.com/lucmoreau/ProvToolbox/wiki/provconvert ), create
a prove directory on the server (where prov-n files and logs will
be kept), and install the cgi-bin/prov script according to your
server configuration, editing the hard paths in the script accordingly.
Also edit the POST action in NumbersIntoNotes.html to call your CGI
script.

David De Roure, 21 February 2016

Please email numbersintonotes@gmail.com with any questions, bug
reports, and suggestions for new features.  This application is
currently only supported on Chrome and Firefox.

Written by David De Roure, December 2015, for the Ada Lovelace
Symposium and as an interactive demonstration to encourage discussion
about music, mathematics, and programming at the time of Ada Lovelace.
Thanks to Emily Howard and Lasse Rempe-Gillen for their inspiration
through Ada sketches, to Pip Willcox for jointly organising the
Numbers into Notes project, and to all our colleagues for feedback
and ideas. This research is supported by the Transforming Musicology
(http://www.transforming-musicology.org/) project funded by the
Arts and Humanities Research Council, and the FAST
(http://www.semanticaudio.ac.uk/) project funded by the Engineering
and Physical Sciences Research Council.
