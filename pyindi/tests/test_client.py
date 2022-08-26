from pyindi.client import INDIClientSingleton
import pytest
import asyncio


@pytest.mark.asyncio
async def test_conn():

    client = INDIClientSingleton()
    client.start(host="localhost", port=7624)
    conntask = asyncio.create_task(client.connect())
    await asyncio.sleep(2.0) # give it 2 seconds to connect
    assert client.is_connected, ""

