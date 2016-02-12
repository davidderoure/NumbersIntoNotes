Numbers Into Notes

Javascript interactive demo in which number sequences are converted
into notes, to encourage discussion about music, mathematics, and
programming at the time of Ada Lovelace.  Written by David De Roure
for the Ada Lovelace Symposium held in Oxford in December 2015.

Contact david.deroure@oerc.ox.ac.uk

This is a single page application designed for a standalone demo
using a laptop and widescreen display, so it assumes keyboard and
mouse (and audio) rather than small or touchscreen devices - however
it works pretty well in a desktop browser thanks to Bootstrap. It
has been developed and tested entirely in Chrome on a Mac.

For the demo it was designed to be run offline (e.g. it can be
distributed as a zip file and run off a USB stick).  Unzip and then
click on NumbersIntoNotes.html

It can also be run online from a web server.  The test server is

http://demeter.oerc.ox.ac.uk/NumbersIntoNotes/

The latest zip file for offline use can be found on

http://demeter.oerc.ox.ac.uk/NumbersIntoNotes/NiN.zip

Optionally the application can POST to CGI scripts, to generate
musical notation and standard MIDI files, using Lilypond and csvmidi
respectively.  This functionality is enabled on the server above.
The "Generate PDF" and "Generate MIDI" buttons are hidden unless
these CGI scripts are available.

(The conversion sofware is open source and can be installed either
on a remote server or on the local machine to make the export
functionality available for standalone demo purposes. Two POST
actions in the HTML need to be edited to point at the appropriate
server.)

This version released 12 February 2016.

Thanks to Emily Howard and Lasse Rempe-Gillen for their inspiration
through Ada sketches, to Pip Willcox for jointly organising the
Numbers into Notes project, and to all our colleagues for feedback
and ideas. This research is supported by the Transforming Musicology
project funded by the Arts and Humanities Research Council, and the
FAST project funded by the Engineering and Physical Sciences Research
Council.
