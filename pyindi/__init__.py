# Licensed under a 3-clause BSD style license - see LICENSE.rst

# Packages may add whatever they like to this file, but
# should keep this content at the top.
# ----------------------------------------------------------------------------
from ._astropy_init import *   # noqa
# ----------------------------------------------------------------------------

<<<<<<< HEAD
#:w
# from . import device
#from .client import INDIWebApp
=======
#from . import device
#from . import client
>>>>>>> 6e0b8b92296636f92fd3f0ae4f27c53cfd8cdb65

__all__ = []
#from .example_mod import *   # noqa
# Then you can be explicit to control what ends up in the namespace,
__all__ += ['do_primes']   # noqa
# or you can keep everything from the subpackage with the following instead
# __all__ += example_mod.__all__


