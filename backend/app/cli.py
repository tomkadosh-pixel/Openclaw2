import asyncio

from loguru import logger

from app.services.shadow_runner import ShadowRunner


async def main() -> None:
    runner = ShadowRunner()
    try:
        await runner.run()
    except KeyboardInterrupt:
        logger.info("Stopping shadow runner…")
        await runner.stop()


if __name__ == "__main__":
    asyncio.run(main())
