/*
 * wrappers.c -- enscripten wrapper functions
 *
 * Eric Mandel 10/11/2013 (during the Great Government Shutdown)
 *
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <setjmp.h>
#include <time.h>
#include <math.h>
#include <ctype.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <dirent.h>
#include "wcs.h"
#include "em.h"
#include "strtod.h"
#include "cdl.h"

#include <emscripten.h>

#define PI		3.141592653589793238462643
#define DEG2RAD(a)	((PI/180.0)*a)
#define RAD2DEG(a)	((180.0/PI)*a)

#define WCS_SEXAGESIMAL 0
#define WCS_DEGREES 1

#define NDEC 3

#define SZ_LINE  65536
#define MAX_ARGS 10

/* must match Module['rootdir'] in post.js! */
#define ROOTDIR "/"

/* static return buffer */
static char rstr[SZ_LINE];
static char *fstr;
static int fsize = 0;

/* hold information about wcs for individual images */
typedef struct infostruct {
  struct WorldCoor *wcs;
  int wcsunits;
  char str[SZ_LINE];
} *Info, InfoRec;

/* management of info records */
static Info infos=NULL;
static int ninfo = 1;
static int maxinfo = 0;
static int maxinc = 10;
static int nstatus=0;

/* low-level routines called in emscripten enironment */
int mTANHdr(int argc, char **argv);
int mProjectPP(int argc, char **argv);
int mAdd(int argc, char **argv);
int mImgtbl(int argc, char **argv);
int mMakeHdr(int argc, char **argv);
int mShrinkHdr(int argc, char **argv);
int js9helper(int argc, char **argv);
int _listhdu(char *iname, char *oname);
int _regcnts (int argc, char **argv);
void emscripten_exit_with_live_runtime(void);

/*
 *
 * private routines
 *
 */

/* upper to lower case */
static void culc(char *s)
{
  while(*s){
    if( isupper((int)*s) )
      *s = tolower(*s);
    s++;
  }
}

/* lower to upper case */
static void cluc(char *s)
{
  while(*s){
    if( islower((int)*s) )
      *s = toupper(*s);
    s++;
  }
}

static int nowhite (char *c, char *cr)
{
  char *cr0;    /* initial value of cr */
  int n;        /* the number of characters */

  /* skip leading white space */
  while(*c && isspace((int)*c))
    c++;
  /* copy up to the null */
  cr0 = cr;
  while(*c)
    *cr++ = *c++;
  n = cr - cr0;   /* the number of characters */
  *cr-- = '\0';   /* Null and point to the last character */
  /* remove trailing white space */
  while( n && isspace((int)*cr) ){
    *cr-- = '\0';
    n--;
  }
  return(n);
}

static int filecontents(char *path, char *obuf, int osize){
  int got;
  FILE *fd;
  /* open the file */
  if( !(fd=fopen(path, "r")) ){
    return -1;
  }
  /* get contents */
  got = fread(obuf, sizeof(char), osize-1, fd);
  fclose(fd);
  obuf[got] = '\0';
  return got;
}

static int filecontents2(char *path, char **obuf, int *osize){
  int fsize;
  struct stat buf;
  if( stat(path, &buf) <0 ){
    return -1;
  }
  fsize = buf.st_size;
  if( fsize >= *osize ){
    if( *obuf != NULL ){
      free(*obuf);
    }
    *obuf = (char *)calloc(fsize+1, sizeof(char));
    if( *obuf ){
      *osize = fsize+1;
    } else {
      return -1;
    }
  }
  return filecontents(path, *obuf, *osize);
}

/* add a new Info record with a valid wcs struct */
static int newinfo(struct WorldCoor *wcs){
  int i, n, cinfo;
  /* init info array */
  if( maxinfo == 0 ){
    maxinfo = maxinc;
    infos = malloc(maxinfo * sizeof(InfoRec));
    if( !infos ){
      return -4;
    }
  }
  /* increase info array, if necessary */
  while( ninfo >= maxinfo ){
    maxinfo += maxinc;
    infos = realloc(infos, maxinfo * sizeof(InfoRec));
    if( !infos ){
      return -3;
    }
  }
  /* assume we will use next available slot */
  cinfo = ninfo;
  /* but look for an empty slot */
  for(i=1; i<ninfo; i++){
    if( infos[i].wcs == NULL ){
      cinfo = i;
      break;
    }
  }
  /* populate slot with wcs info */
  if( wcs ){
    n = cinfo;
    infos[n].wcs = wcs;
    infos[n].wcsunits = WCS_SEXAGESIMAL;
    *infos[n].str = '\0';
    if( cinfo == ninfo ){
      ninfo++;
    }
  } else {
    n = -1;
  }
  return n;
}

/* free wcs and info records */
static int freeinfo(int n){
  if( (n < 0) || (n >= ninfo) ){
    return 0;
  }
  if( infos[n].wcs ){
    wcsfree(infos[n].wcs);
    infos[n].wcs = NULL;
  }
  return n;
}

/* return Info record for this id */
static Info getinfo(int n){
  if( (n < 1) || (n >= maxinfo) ){
    return NULL;
  } else {
    return &infos[n];
  }
}

/*
 *
 * semi-public routines: these are used within emscripten elsewhere
 *
 */

/*
   When running emscripten-compiled programs, we want to to avoid exiting the
   emscripten environment if the program calls exit(). So we do a setjmp and
   redefine exit to do a longjmp.

   The basic pattern is:

   if( !EM_SETJMP ){
     _regcnts(i, args);
   }

   where an exit() in the program will call longjmp();

*/

/*
 *
 * public routines: these are exported to javascript
 *
 */

/* init the wcs struct and create a new info record */
int initwcs(char *s, int n){
  struct WorldCoor *wcs;
  if( n > 0 ){
    wcs = wcsninit(s, n);
  } else {
    // setting to 0 breaks Montage's checkWCS call
    // hlength(s, 0);
    // wcslib's hget.c uses 256000 as the default max, so we will too
    hlength(s, 256000);
    wcs = wcsinit(s);
  }
  if( wcs ){
    wcsoutinit(wcs, getradecsys(wcs));
  }
  return newinfo(wcs);
}

/* free the wcs struct */
int freewcs(int n){
  return freeinfo(n);
}

/* return important info about the wcs (used by region parsing) */
char *wcsinfo(int n){
  Info info = getinfo(n);
  char *str = NULL;
  char *ptype=NULL;
  char *radecsys=NULL;
  char *c1type=NULL;
  char *c2type=NULL;
  double crval1=0.0, crval2=0.0, crpix1=0.0, crpix2=0.0, cdelt1=0.0, cdelt2=0.0;
  double crot=0.0;
  if( !info ){
    return NULL;
  }
  if( info->wcs ){
    if( !info->wcs->coorflip ){
      cdelt1 = info->wcs->cdelt[0];
      cdelt2 = info->wcs->cdelt[1];
    }
    else{
      cdelt1 = info->wcs->cdelt[1];
      cdelt2 = info->wcs->cdelt[0];
    }
    if ( info->wcs->imflip ) {
	crot = -info->wcs->rot;
    } else {
	crot =  info->wcs->rot;
    }
    crval1 = info->wcs->crval[0];
    crval2 = info->wcs->crval[1];
    crpix1 = info->wcs->crpix[0];
    crpix2 = info->wcs->crpix[1];
    c1type = info->wcs->c1type;
    c2type = info->wcs->c2type;
    ptype = info->wcs->ptype;
    radecsys = info->wcs->radecsys;
  }
  str = info->str;
  snprintf(str, SZ_LINE-1,
	   "{\"crval1\": %.14g, \"crval2\": %.14g, \"crpix1\": %.14g, \"crpix2\": %.14g, \"cdelt1\": %.14g, \"cdelt2\": %.14g, \"crot\": %.14g, \"ctype1\": \"%s\", \"ctype2\": \"%s\",  \"ptype\": \"%s\", \"radecsys\": \"%s\"}",
	   crval1, crval2, crpix1, crpix2, cdelt1, cdelt2, crot,
	   c1type, c2type, ptype, radecsys);
  return str;
}

/* convert pixels to wcs and return string */
char *pix2wcsstr(int n, double xpix, double ypix){
  Info info = getinfo(n);
  char *str = NULL;
  if( info && info->wcs ){
    str = info->str;
    *str = '\0';
    /* convert image x,y to ra,dec */
    pix2wcst(info->wcs, xpix, ypix, str, SZ_LINE);
  }
  return str;
}

/* convert pixels to wcs and return string */
char *wcs2pixstr(int n, double ra, double dec){
  Info info = getinfo(n);
  char str[SZ_LINE];
  double xpix, ypix;
  int offscale;
  if( info && info->wcs ){
    wcs2pix(info->wcs, ra, dec, &xpix, &ypix, &offscale);
    snprintf(str, SZ_LINE-1, "%.6f %.6f", xpix, ypix);
    nowhite(str, info->str);
    return info->str;
  } else {
    return NULL;
  }
}

/* set or get wcssys (FK4, FK5, etc) */
char *wcssys(int n, char *s){
  Info info = getinfo(n);
  char *str = NULL;
  if( info && info->wcs ){
    str = info->str;
    *str = '\0';
    if( s && *s &&
	(!strcasecmp(s, "galactic") || !strcasecmp(s, "ecliptic") ||
	 !strcasecmp(s, "linear")   || (wcsceq(s) > 0.0)) ){
      /* try to set the wcs system */
      wcsoutinit(info->wcs, s);
      wcsininit(info->wcs, s);
    }
    /* always return current */
    strncpy(str, getwcsout(info->wcs), SZ_LINE);
    if( !strcasecmp(str, "galactic") ){
      strcpy(str, "galactic");
    } else if( !strcasecmp(str, "ecliptic") ){
      strcpy(str, "ecliptic");
    } else if( !strcasecmp(str, "linear") ){
      strcpy(str, "linear");
    } else {
      cluc(str);
    }
  }
  return str;
}

/* set or get wcs units (degrees or sexigesimal) */
char *wcsunits(int n, char *s){
  Info info = getinfo(n);
  char *str = NULL;
  char *mywcssys=NULL;
  if( info && info->wcs ){
    str = info->str;
    *str = '\0';
    /* linear is always degrees */
    mywcssys = wcssys(n, NULL);
    if( !strcasecmp(mywcssys, "linear") ){
      s = "degrees";
    }
    /* set the units */
    if( s && *s ){
      if( !strcasecmp(s, "degrees") ){
	setwcsdeg(info->wcs, WCS_DEGREES);
	info->wcsunits = WCS_DEGREES;
      } else {
	setwcsdeg(info->wcs, WCS_SEXAGESIMAL);
        wcsndec(info->wcs, 3);
	info->wcsunits = WCS_SEXAGESIMAL;
      }
    }
    switch(info->wcsunits){
    case WCS_DEGREES:
      strncpy(str, "degrees", SZ_LINE-1);
    break;
    case WCS_SEXAGESIMAL:
      strncpy(str, "sexagesimal", SZ_LINE-1);
    break;
    }
    culc(str);
  }
  return str;
}

/* convert image values to wcs values in a region (see fitshelper.c) */
char *reg2wcsstr(int n, char *regstr){
  Info info = getinfo(n);
  char tbuf[SZ_LINE];
  char tbuf2[SZ_LINE];
  char rbuf1[SZ_LINE];
  char rbuf2[SZ_LINE];
  char *str = NULL;
  char *s=NULL, *t=NULL;;
  char *s1=NULL, *s2=NULL;
  char *saves1=NULL;
  char *targs=NULL, *targ=NULL;
  char *mywcssys=NULL;
  int mywcsunits;
  int alwaysdeg = 0;
  int nq = 0;
  double sep = 0.0;
  double dval1, dval2, dval3, dval4;
  double rval1, rval2, rval3, rval4;

  if( info && info->wcs ){
    mywcssys = wcssys(n, NULL);
    mywcsunits = info->wcsunits;
    if( !strcasecmp(mywcssys, "galactic") ||
	!strcasecmp(mywcssys, "ecliptic") ){
      alwaysdeg = 1;
    } else if( !strcasecmp(mywcssys, "linear") ){
      mywcsunits = WCS_DEGREES;
    }
    str = info->str;
    *str = '\0';
    /* start with original input string */
    targs = (char *)strdup(regstr);
    for(targ=(char *)strtok(targs, ";"); targ != NULL;
	targ=(char *)strtok(NULL,";")){
      s = targ;
      /* look for region type */
      t = strchr(s, ' ');
      if( t ){
	s1 = t + 1;
	*t = '\0';
      } else {
	s = NULL;
	s1 = "";
      }
      /* these are the coords of the region */
      saves1 = s1;
      if( (dval1=strtod(s1, &s2)) && (dval2=strtod(s2, &s1)) ){
	/* convert image x,y to ra,dec */
	pix2wcs(info->wcs, dval1, dval2, &rval1, &rval2);
	if( s ){
	  snprintf(tbuf, SZ_LINE, "%s(", s);
	  strncat(str, tbuf, SZ_LINE-1);
	}
	/* convert to proper units */
	switch(mywcsunits){
	case WCS_DEGREES:
	  snprintf(tbuf, SZ_LINE, "%.6f,%.6f", rval1, rval2);
	  strncat(str, tbuf, SZ_LINE-1);
	  break;
	case WCS_SEXAGESIMAL:
	  if( alwaysdeg ){
	    dec2str(rbuf1, SZ_LINE-1, rval1, NDEC);
	  } else {
	    ra2str(rbuf1, SZ_LINE-1, rval1, NDEC);
	  }
	  dec2str(rbuf2, SZ_LINE-1, rval2, NDEC);
	  snprintf(tbuf, SZ_LINE, "%s,%s", rbuf1, rbuf2);
	  strncat(str, tbuf, SZ_LINE-1);
	  break;
	default:
	  snprintf(tbuf, SZ_LINE, "%.6f,%.6f", rval1, rval2);
	  strncat(str, tbuf, SZ_LINE-1);
	  break;
	}
	/* for text, copy the quoted string and get final angle */
	if( !strcmp(s, "text") ){
	  t = tbuf;
	  *t++ = ',';
	  while( *s1 && isspace((int)*s1) ){
	    s1++;
	  }
	  while( *s1 && nq < 2 ){
	    if( *s1 == '"' ){ nq++; }
	    *t++ = *s1++;
	  }
	  *t = '\0';
	  /* this is the text string */
	  strncat(str, tbuf, SZ_LINE-1);
	  /* this is the angle */
	  dval1=strtod(s1, &s2);
	} else if( !strcmp(s, "polygon") || !strcmp(s, "line") ){
	  /* for polygons and lines, convert successive image pos to RA, Dec */
	  while( (dval1=strtod(s1, &s2)) && (dval2=strtod(s2, &s1)) ){
	    /* convert image x,y to ra,dec */
	    pix2wcs(info->wcs, dval1, dval2, &rval1, &rval2);
	    /* convert to proper units */
	    switch(mywcsunits){
	    case WCS_DEGREES:
	      snprintf(tbuf, SZ_LINE, ",%.6f,%.6f", rval1, rval2);
	      strncat(str, tbuf, SZ_LINE-1);
	      break;
	    case WCS_SEXAGESIMAL:
	      if( alwaysdeg ){
		dec2str(rbuf1, SZ_LINE-1, rval1, NDEC);
	      } else {
		ra2str(rbuf1, SZ_LINE-1, rval1, NDEC);
	      }
	      dec2str(rbuf2, SZ_LINE-1, rval2, NDEC);
	      snprintf(tbuf, SZ_LINE, ",%s,%s", rbuf1, rbuf2);
	      strncat(str, tbuf, SZ_LINE-1);
	      break;
	    default:
	      snprintf(tbuf, SZ_LINE, ",%.6f,%.6f", rval1, rval2);
	      strncat(str, tbuf, SZ_LINE-1);
	      break;
	    }
	  }
	  /* for lines, get total distance of the segments */
	  if( !strcmp(s, "line") ){
	    s1 = saves1;
	    /* use successive x1,y1,x2,y2 to calculate separation (arcsecs) */
	    if( (dval1=strtod(s1, &s2)) && (dval2=strtod(s2, &s1)) ){
	      while(  (dval3=strtod(s1, &s2)) && (dval4=strtod(s2, &s1)) ){
		/* convert image x,y to ra,dec */
		pix2wcs(info->wcs, dval1, dval2, &rval1, &rval2);
		pix2wcs(info->wcs, dval3, dval4, &rval3, &rval4);
		/* calculate and output separation between the two points */
		sep += wcsdist(rval1, rval2, rval3, rval4);
		/* set up for next separation */
		dval1 = dval3;
		dval2 = dval4;
	      }
	    }
	  }
	} else {
	  /* use successive x1,y1,x2,y2 to calculate separation (arcsecs) */
	  while( (dval1=strtod(s1, &s2)) && (dval2=strtod(s2, &s1)) &&
		 (dval3=strtod(s1, &s2)) && (dval4=strtod(s2, &s1)) ){
	    /* convert image x,y to ra,dec */
	    pix2wcs(info->wcs, dval1, dval2, &rval1, &rval2);
	    pix2wcs(info->wcs, dval3, dval4, &rval3, &rval4);
	    /* calculate and output separation between the two points */
	    sep = wcsdist(rval1, rval2, rval3, rval4);
	    /* convert to proper units */
	    switch(mywcsunits){
	    case WCS_DEGREES:
	      snprintf(tbuf, SZ_LINE, ",%.6f", sep);
	      strncat(str, tbuf, SZ_LINE-1);
	      break;
	    case WCS_SEXAGESIMAL:
	      if( sep < 1 ){
		snprintf(tbuf, SZ_LINE, ",%.6f\"", sep * 3600.0);
		strncat(str, tbuf, SZ_LINE-1);
	      } else {
		snprintf(tbuf, SZ_LINE, ",%.6fd", sep);
		strncat(str, tbuf, SZ_LINE-1);
	      }
	      break;
	    default:
	      snprintf(tbuf, SZ_LINE, ",%.6f", sep);
	      strncat(str, tbuf, SZ_LINE-1);
	      break;
	    }
	  }
	}
	/* output angle, as needed */
	if( !strcmp(s, "box")     || !strcmp(s, "cross") ||
	    !strcmp(s, "ellipse") || !strcmp(s, "text")  ){
	  while( dval1 < 0 ) dval1 += (2.0 * PI);
	  snprintf(tbuf, SZ_LINE, ",%.6f", RAD2DEG(dval1));
	  strncat(str, tbuf, SZ_LINE-1);
	}
	/* close region */
	if( s ){
	  snprintf(tbuf, SZ_LINE, ")");
	  strncat(str, tbuf, SZ_LINE-1);
	}
	/* for lines, add total line segment distance */
	if( !strcmp(s, "line") ){
	  switch(mywcsunits){
	  case WCS_DEGREES:
	    snprintf(tbuf, SZ_LINE,
		     " {\"size\":%.6f,\"units\":\"degrees\"}", sep);
	    strncat(str, tbuf, SZ_LINE-1);
	    break;
	  case WCS_SEXAGESIMAL:
	    if( sep < 1 ){
	      snprintf(tbuf, SZ_LINE,
		       " {\"size\":%.2f,\"units\":\"arcsec\"}", sep * 3600);
	      strncat(str, tbuf, SZ_LINE-1);
	    } else {
	      snprintf(tbuf, SZ_LINE,
		       " {\"size\":%.6f,\"units\":\"degrees\"}", sep);
	      strncat(str, tbuf, SZ_LINE-1);
	    }
	    break;
	  default:
	    snprintf(tbuf, SZ_LINE,
		     " {\"size\":%.6f,\"units\":\"degrees\"}", sep);
	    strncat(str, tbuf, SZ_LINE-1);
	    break;
	  }
	}
	snprintf(tbuf, SZ_LINE, ";");
	strncat(str, tbuf, SZ_LINE-1);
      }
    }
  }
  if( targs ) free(targs);
  return str;
}

/* convert string to float (includes sexagesimal strings) */
double saostrtod(char *s){
  return SAOstrtod(s, NULL);
}

/* convert float to string (includes sexagesimal strings) */
char *saodtostr(double val, char *vtype, int prec){
  int type = vtype[0];
  SAOconvert(rstr, val, type, prec);
  return rstr;
}

/* return last delimiter from saostrtod call */
int saodtype(){
  return SAOdtype;
}

/* required by cdlzscale.c */
int cdl_debug=0;

/* calculate zscale parameters */
char *zscale(unsigned char *im, int nx, int ny, int bitpix,
	     float contrast, int numsamples, int perline){
  float z1, z2;
  char tbuf[SZ_LINE];
  /* assume the worst */
  *tbuf = '\0';
  /* call the low-level routine, guarding against exit() calls */
  if( !EM_SETJMP ){
    /* make the low-level zscale call */
    cdl_zscale(im, nx, ny, bitpix, &z1, &z2, contrast, numsamples, perline);
    /* encode in a string for easy return */
    snprintf(tbuf, SZ_LINE-1, "%f %f", z1, z2);
  }
  nowhite(tbuf, rstr);
  return rstr;
}

/* generate alternate WCS header using Montage/mTANHdr */
char *tanhdr(char *iname, char *oname, char *cmdswitches){
  int i=0, j=0;
  char *targs=NULL, *targ=NULL;
  char *args[SZ_LINE];
  char tbufs[MAX_ARGS][SZ_LINE];
  char file0[SZ_LINE];
  char file1[SZ_LINE];
  char file2[SZ_LINE];
  args[i++] = "mTANHdr";
  if( cmdswitches && *cmdswitches ){
    targs = (char *)strdup(cmdswitches);
    for(targ=(char *)strtok(targs, " \t"); targ != NULL;
	targ=(char *)strtok(NULL," \t")){
      if( j < MAX_ARGS ){
	strncpy(tbufs[j], targ, SZ_LINE-1);
	args[i++] = tbufs[j++];
      } else {
	break;
      }
    }
    if( targs ) free(targs);
  }
  args[i++] = "-s";
  snprintf(file0, SZ_LINE-1, "%sstatus_%d.txt", ROOTDIR, nstatus++);
  args[i++] = file0;
  snprintf(file1, SZ_LINE-1, "%s%s", ROOTDIR, iname);
  args[i++] = file1;
  snprintf(file2, SZ_LINE-1, "%s%s", ROOTDIR, oname);
  args[i++] = file2;
  /* call the low-level routine, guarding against exit() calls */
  if( !EM_SETJMP ){
    /* make the low-level tan hdr generation call */
    mTANHdr(i, args);
  }
  /* look for a return value */
  if( filecontents(file0, rstr, SZ_LINE) > 0 ){
    unlink(file0);
    return rstr;
  } else {
    return "Error: tanhdr failed; no status file created";
  }
}

/* reproject using Montage/mProjectPP */
char *reproject(char *iname, char *oname, char *wname, char *cmdswitches){
  int i=0, j=0;
  char *targs=NULL, *targ=NULL;
  char *args[SZ_LINE];
  char tbufs[MAX_ARGS][SZ_LINE];
  char file0[SZ_LINE];
  char file1[SZ_LINE];
  char file2[SZ_LINE];
  char file3[SZ_LINE];
  args[i++] = "mProjectPP";
  if( cmdswitches && *cmdswitches ){
    targs = (char *)strdup(cmdswitches);
    for(targ=(char *)strtok(targs, " \t"); targ != NULL;
	targ=(char *)strtok(NULL," \t")){
      if( j < MAX_ARGS ){
	strncpy(tbufs[j], targ, SZ_LINE-1);
	args[i++] = tbufs[j++];
      } else {
	break;
      }
    }
    if( targs ) free(targs);
  }
  args[i++] = "-s";
  snprintf(file0, SZ_LINE-1, "%sstatus_%d.txt", ROOTDIR, nstatus++);
  args[i++] = file0;
  snprintf(file1, SZ_LINE-1, "%s%s", ROOTDIR, iname);
  args[i++] = file1;
  snprintf(file2, SZ_LINE-1, "%s%s", ROOTDIR, oname);
  args[i++] = file2;
  snprintf(file3, SZ_LINE-1, "%s%s", ROOTDIR, wname);
  args[i++] = file3;
  /* call the low-level routine, guarding against exit() calls */
  if( !EM_SETJMP ){
    /* make the low-level reprojection call */
    mProjectPP(i, args);
  }
  /* look for a return value */
  if( filecontents(file0, rstr, SZ_LINE) >= 0 ){
    unlink(file0);
    return rstr;
  } else {
    return "Error: reproject failed; no status file created";
  }
}

/* add mosaics using Montage/mAdd */
char *madd(char *tname, char *hname, char *oname, char *cmdswitches){
  int i=0, j=0;
  char *targs=NULL, *targ=NULL;
  char *args[SZ_LINE];
  char tbufs[MAX_ARGS][SZ_LINE];
  char file0[SZ_LINE];
  char file1[SZ_LINE];
  char file2[SZ_LINE];
  char file3[SZ_LINE];
  args[i++] = "mAdd";
  if( cmdswitches && *cmdswitches ){
    targs = (char *)strdup(cmdswitches);
    for(targ=(char *)strtok(targs, " \t"); targ != NULL;
	targ=(char *)strtok(NULL," \t")){
      if( j < MAX_ARGS ){
	strncpy(tbufs[j], targ, SZ_LINE-1);
	args[i++] = tbufs[j++];
      } else {
	break;
      }
    }
    if( targs ) free(targs);
  }
  args[i++] = "-s";
  snprintf(file0, SZ_LINE-1, "%sstatus_%d.txt", ROOTDIR, nstatus++);
  args[i++] = file0;
  snprintf(file1, SZ_LINE-1, "%s%s", ROOTDIR, tname);
  args[i++] = file1;
  snprintf(file2, SZ_LINE-1, "%s%s", ROOTDIR, hname);
  args[i++] = file2;
  snprintf(file3, SZ_LINE-1, "%s%s", ROOTDIR, oname);
  args[i++] = file3;
  /* call the low-level routine, guarding against exit() calls */
  if( !EM_SETJMP ){
    /* make the low-level mosaic add call */
    mAdd(i, args);
  }
  /* look for a return value */
  if( filecontents(file0, rstr, SZ_LINE) > 0 ){
    unlink(file0);
    return rstr;
  } else {
    return "Error: madd failed; no status file created";
  }
}

/* create image metadata table using Montage/mImgtbl */
char *imgtbl(char *iname, char *dname, char *tname, char *cmdswitches){
  int i=0, j=0;
  char *targs=NULL, *targ=NULL;
  char *args[SZ_LINE];
  char tbufs[MAX_ARGS][SZ_LINE];
  char file0[SZ_LINE];
  char file1[SZ_LINE];
  char file2[SZ_LINE];
  char file3[SZ_LINE];
  args[i++] = "mImgtbl";
  if( cmdswitches && *cmdswitches ){
    targs = (char *)strdup(cmdswitches);
    for(targ=(char *)strtok(targs, " \t"); targ != NULL;
	targ=(char *)strtok(NULL," \t")){
      if( j < MAX_ARGS ){
	strncpy(tbufs[j], targ, SZ_LINE-1);
	args[i++] = tbufs[j++];
      } else {
	break;
      }
    }
    if( targs ) free(targs);
  }
  args[i++] = "-s";
  snprintf(file0, SZ_LINE-1, "%sstatus_%d.txt", ROOTDIR, nstatus++);
  args[i++] = file0;
  args[i++] = "-t";
  snprintf(file1, SZ_LINE-1, "%s%s", ROOTDIR, iname);
  args[i++] = file1;
  snprintf(file2, SZ_LINE-1, "%s%s", ROOTDIR, dname);
  args[i++] = file2;
  snprintf(file3, SZ_LINE-1, "%s%s", ROOTDIR, tname);
  args[i++] = file3;
  /* call the low-level routine, guarding against exit() calls */
  if( !EM_SETJMP ){
    /* make the low-level image table generation call */
    mImgtbl(i, args);
  }
  /* look for a return value */
  if( filecontents(file0, rstr, SZ_LINE) > 0 ){
    unlink(file0);
    return rstr;
  } else {
    return "Error: imgtbl failed; no status file created";
  }
}

/* create new FITS header using Montage/mMakeHdr */
char *makehdr(char *tname, char *hname, char *cmdswitches){
  int i=0, j=0;
  char *targs=NULL, *targ=NULL;
  char *args[SZ_LINE];
  char tbufs[MAX_ARGS][SZ_LINE];
  char file0[SZ_LINE];
  char file1[SZ_LINE];
  char file2[SZ_LINE];
  args[i++] = "mMakeHdr";
  if( cmdswitches && *cmdswitches ){
    targs = (char *)strdup(cmdswitches);
    for(targ=(char *)strtok(targs, " \t"); targ != NULL;
	targ=(char *)strtok(NULL," \t")){
      if( j < MAX_ARGS ){
	strncpy(tbufs[j], targ, SZ_LINE-1);
	args[i++] = tbufs[j++];
      } else {
	break;
      }
    }
    if( targs ) free(targs);
  }
  args[i++] = "-s";
  snprintf(file0, SZ_LINE-1, "%sstatus_%d.txt", ROOTDIR, nstatus++);
  args[i++] = file0;
  snprintf(file1, SZ_LINE-1, "%s%s", ROOTDIR, tname);
  args[i++] = file1;
  snprintf(file2, SZ_LINE-1, "%s%s", ROOTDIR, hname);
  args[i++] = file2;
  /* call the low-level routine, guarding against exit() calls */
  if( !EM_SETJMP ){
    /* make the low-level header generation call */
    mMakeHdr(i, args);
  }
  /* look for a return value */
  if( filecontents(file0, rstr, SZ_LINE) > 0 ){
    unlink(file0);
    return rstr;
  } else {
    return "Error: makehdr failed; no status file created";
  }
}

char *shrinkhdr(int dim, char *iname, char *oname, char *cmdswitches){
  int i=0, j=0;
  char *targs=NULL, *targ=NULL;
  char *args[SZ_LINE];
  char tbufs[MAX_ARGS][SZ_LINE];
  char dimstr[SZ_LINE];
  char file0[SZ_LINE];
  char file1[SZ_LINE];
  char file2[SZ_LINE];
  char file3[SZ_LINE];
  args[i++] = "mShrinkHdr";
  if( cmdswitches && *cmdswitches ){
    targs = (char *)strdup(cmdswitches);
    for(targ=(char *)strtok(targs, " \t"); targ != NULL;
	targ=(char *)strtok(NULL," \t")){
      if( j < MAX_ARGS ){
	strncpy(tbufs[j], targ, SZ_LINE-1);
	args[i++] = tbufs[j++];
      } else {
	break;
      }
    }
    if( targs ) free(targs);
  }
  args[i++] = "-S";
  snprintf(dimstr, SZ_LINE-1, "%d", dim);
  args[i++] = dimstr;
  args[i++] = "-s";
  snprintf(file0, SZ_LINE-1, "%sstatus_%d.txt", ROOTDIR, nstatus++);
  args[i++] = file0;
  snprintf(file1, SZ_LINE-1, "%s%s", ROOTDIR, iname);
  args[i++] = file1;
  snprintf(file2, SZ_LINE-1, "%s%s", ROOTDIR, oname);
  args[i++] = file2;
  /* call the low-level routine, guarding against exit() calls */
  if( !EM_SETJMP ){
    /* make the low-level shrink header call */
    mShrinkHdr(i, args);
  }
  /* look for a return value */
  if( filecontents(file0, rstr, SZ_LINE) > 0 ){
    unlink(file0);
    return rstr;
  } else {
    return "Error: shrinkhdr failed; no status file created";
  }
}

/* call js9helper program to perform imsection commands */
int imsection(char *iname, char *oname, char *section, char *filter){
  int i=0;
  char *args[SZ_LINE];
  char file0[SZ_LINE];
  char file1[SZ_LINE];
  args[i++] = "js9helper";
  args[i++] = "-i";
  snprintf(file0, SZ_LINE-1, "%s%s", ROOTDIR, iname);
  args[i++] = file0;
  args[i++] = "imsection";
  snprintf(file1, SZ_LINE-1, "%s%s", ROOTDIR, oname);
  args[i++] = file1;
  args[i++] = section;
  args[i++] = filter;
  /* make the js9 helper call */
  return js9helper(i, args);
}

/* get info about the hdus in a FITS file */
char *listhdu(char *iname){
  char file0[SZ_LINE];
  char file1[SZ_LINE];
  snprintf(file0, SZ_LINE-1, "%s%s", ROOTDIR, iname);
  snprintf(file1, SZ_LINE-1, "%s%s.hdulist", ROOTDIR, iname);
  _listhdu(file0, file1);
  if( filecontents(file1, rstr, SZ_LINE) >= 0 ){
    unlink(file1);
    return rstr;
  } else {
    return "Error: listhdu failed; no list file created";
  }
}

char *regcnts(char *iname, char *sregion, char *bregion, char *cmdswitches){
  int i=0, j=0;
  char *targs=NULL, *targ=NULL;
  char *args[SZ_LINE];
  char tbufs[MAX_ARGS][SZ_LINE];
  char file0[SZ_LINE];
  char file1[SZ_LINE];
  char file2[SZ_LINE];
  args[i++] = "_regcnts";
  if( cmdswitches && *cmdswitches ){
    targs = (char *)strdup(cmdswitches);
    for(targ=(char *)strtok(targs, " \t"); targ != NULL;
	targ=(char *)strtok(NULL," \t")){
      if( j < MAX_ARGS ){
	strncpy(tbufs[j], targ, SZ_LINE-1);
	args[i++] = tbufs[j++];
      } else {
	break;
      }
    }
    if( targs ) free(targs);
  }
  args[i++] = "-e";
  snprintf(file0, SZ_LINE-1, "%sregcnts_errors_%d.txt", ROOTDIR, nstatus++);
  args[i++] = file0;
  /* make up output file */
  args[i++] = "-o";
  snprintf(file1, SZ_LINE-1, "%sregcnts_%d.txt", ROOTDIR, nstatus++);
  args[i++] = file1;
  /* input file */
  snprintf(file2, SZ_LINE-1, "%s%s", ROOTDIR, iname);
  args[i++] = file2;
  /* regions */
  args[i++] = sregion;
  args[i++] = bregion;
  /* call the low-level routine, guarding against exit() calls */
  if( !EM_SETJMP ){
    /* make the low-level counts in regions call */
    _regcnts(i, args);
  }
  /* look for an error */
  if( filecontents(file0, rstr, SZ_LINE) > 0 ){
    unlink(file0);
    unlink(file1);
    return rstr;
  }
  /* look for a return value (return all contents) */
  if( filecontents2(file1, &fstr, &fsize) >= 0 ){
    unlink(file0);
    unlink(file1);
    return fstr;
  } else {
    return "Error: regcnts failed; no output file created";
  }
}

/* debugging tool: get content of a virtual file */
char *vcat(char *file, int flen){
  FILE *fd;
  char tbuf[SZ_LINE];
  char tbuf2[SZ_LINE];
  int len, got;
  snprintf(tbuf, SZ_LINE-1, "%s%s", ROOTDIR, file);
  if( (flen > 0) && (flen < SZ_LINE) ){
    len = flen;
  } else {
    len = SZ_LINE - 1;
  }
  *rstr = '\0';
  got = filecontents(tbuf, rstr, len);
  return rstr;
}

/* debugging tool: list virtual files */
int vls(char *dir){
  char tbuf[SZ_LINE];
  char *type, *mydir, *cretime, *modtime;
  int m;
  int got = 0;
  DIR* dfd;
  struct dirent* dirent;
  struct stat buf;
  /* Scanning the in directory */
  if( dir && *dir ){
    mydir = dir;
  } else {
    mydir = ROOTDIR;
  }
  if( !(dfd = opendir(mydir)) ){
    fprintf(stdout, "Error: can't open directory - %s\n", mydir);
    fflush(stdout);
    return 0;
  }
  while( (dirent = readdir(dfd)) ){
    if (!strcmp (dirent->d_name, "."))
      continue;
    if (!strcmp (dirent->d_name, ".."))
      continue;
    if( mydir[strlen(mydir)-1] == '/' ){
      snprintf(tbuf, SZ_LINE, "%s%s", mydir, dirent->d_name);
    } else {
      snprintf(tbuf, SZ_LINE, "%s/%s", mydir, dirent->d_name);
    }
    if( stat(tbuf, &buf) >= 0 ){
      cretime = asctime(gmtime(&(buf.st_ctime)));
      modtime = asctime(gmtime(&(buf.st_mtime)));
      m = buf.st_mode;
      if( S_ISREG(m) )       type = "file";
      else if( S_ISDIR(m) )  type = "dir";
      else if( S_ISCHR(m) )  type = "cdev";
      else if( S_ISBLK(m) )  type = "bdev";
      else if( S_ISFIFO(m) ) type = "fifo";
      else if( S_ISLNK(m) )  type = "link";
      else                   type = "?";
      if( !strcmp(type, "dir") ){
	fprintf(stdout, "%s (dir)\n", dirent->d_name);
      } else {
	fprintf(stdout, "%s (%s):\n\tsize: %d\n\tcre: %s\tmod: %s\n",
		dirent->d_name, type, (int)buf.st_size, cretime, modtime);
      }
      fflush(stdout);
      got++;
    } else {
      fprintf(stdout, "%s (unknown)\n", dirent->d_name);
      fflush(stdout);
    }
  }
  closedir(dfd);
  return got;
}
