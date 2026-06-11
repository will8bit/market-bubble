"use client";

import { useState, type ReactNode } from "react";
import {
  Box,
  HStack,
  VStack,
  Text,
  Flex,
  Image,
  Divider,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useColorMode,
} from "@chakra-ui/react";
import { LuUser, LuSettings2, LuMoon, LuLogOut } from "react-icons/lu";
import { FaTwitch } from "react-icons/fa6";
import { SiKick } from "react-icons/si";
import { useAuth, type LinkedAccount } from "@/lib/auth";
import { useColors } from "@/theme/useColors";

function CosmeticSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const c = useColors();
  return (
    <Box
      as="button"
      onClick={onToggle}
      w="36px"
      h="20px"
      borderRadius={c.radius.pill}
      bg={on ? c.brand.green : c.overlay.strong}
      position="relative"
      transition="background 0.15s"
      flexShrink={0}
    >
      <Box
        position="absolute"
        top="2px"
        left={on ? "18px" : "2px"}
        w="16px"
        h="16px"
        borderRadius="full"
        bg="#fff"
        transition="left 0.15s"
      />
    </Box>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
  right,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  right?: ReactNode;
}) {
  const c = useColors();
  return (
    <HStack
      as={onClick ? "button" : "div"}
      onClick={onClick}
      w="100%"
      spacing="11px"
      px="10px"
      py="9px"
      borderRadius={c.radius.control}
      _hover={{ bg: c.overlay.hover }}
      transition="background 0.12s"
      cursor={onClick ? "pointer" : "default"}
    >
      <Box color={c.text.muted} display="flex">
        {icon}
      </Box>
      <Text fontSize="sm" fontWeight={500} color={c.text.primary} flex="1" textAlign="left">
        {label}
      </Text>
      {right}
    </HStack>
  );
}

function AccountRow({
  icon,
  label,
  color,
  account,
  onConnect,
  onDisconnect,
}: {
  icon: ReactNode;
  label: string;
  color: string;
  account: LinkedAccount | null;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const c = useColors();
  return (
    <HStack w="100%" spacing="11px" px="10px" py="8px">
      <Flex color={color} w="18px" justify="center">
        {icon}
      </Flex>
      <Box flex="1" minW={0}>
        <Text fontSize="sm" color={c.text.primary} noOfLines={1}>
          {label}
        </Text>
        {account && (
          <Text fontSize="2xs" color={c.text.muted} noOfLines={1}>
            @{account.username}
          </Text>
        )}
      </Box>
      <Box
        as="button"
        onClick={account ? onDisconnect : onConnect}
        fontFamily="mono"
        fontSize="2xs"
        px="9px"
        py="4px"
        borderRadius={c.radius.pill}
        bg={c.overlay.soft}
        color={account ? c.brand.red : c.text.muted}
        _hover={{ bg: c.overlay.hover, color: account ? c.brand.red : c.text.primary }}
        transition="all 0.12s"
      >
        {account ? "Disconnect" : "Connect"}
      </Box>
    </HStack>
  );
}

function SettingRow({ label, desc, control }: { label: string; desc: string; control: ReactNode }) {
  const c = useColors();
  return (
    <Flex
      align="center"
      justify="space-between"
      py="14px"
      gap="16px"
      borderBottom="1px solid"
      borderColor={c.border.subtle}
      _last={{ borderBottom: "none" }}
    >
      <Box>
        <Text fontSize="sm" fontWeight={600} color={c.text.primary}>
          {label}
        </Text>
        <Text fontSize="xs" color={c.text.muted} mt="2px">
          {desc}
        </Text>
      </Box>
      {control}
    </Flex>
  );
}

function SettingsBody() {
  const [showBadges, setShowBadges] = useState(true);
  const [compact, setCompact] = useState(false);
  const [profanity, setProfanity] = useState(true);
  const [sounds, setSounds] = useState(false);
  return (
    <VStack align="stretch" spacing="0">
      <SettingRow
        label="Show platform badges"
        desc="Sub, Mod and VIP tags in chat"
        control={<CosmeticSwitch on={showBadges} onToggle={() => setShowBadges((v) => !v)} />}
      />
      <SettingRow
        label="Compact chat"
        desc="Tighter spacing between messages"
        control={<CosmeticSwitch on={compact} onToggle={() => setCompact((v) => !v)} />}
      />
      <SettingRow
        label="Profanity filter"
        desc="Hide flagged words"
        control={<CosmeticSwitch on={profanity} onToggle={() => setProfanity((v) => !v)} />}
      />
      <SettingRow
        label="Chat sounds"
        desc="Play a sound when mentioned"
        control={<CosmeticSwitch on={sounds} onToggle={() => setSounds((v) => !v)} />}
      />
    </VStack>
  );
}

export function ProfileMenu() {
  const c = useColors();
  const { colorMode, toggleColorMode } = useColorMode();
  const dark = colorMode === "dark";
  const [open, setOpen] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { twitch, kick, login, unlink, logout } = useAuth();

  const primary = twitch || kick;
  const signedIn = Boolean(primary);
  const subtitle = twitch && kick ? "Twitch + Kick" : twitch ? "Twitch" : kick ? "Kick" : "Not signed in";

  function openSettings() {
    setOpen(false);
    onOpen();
  }

  return (
    <Box position="relative">
      <Box
        as="button"
        onClick={() => setOpen((v) => !v)}
        w="34px"
        h="34px"
        borderRadius="full"
        bg={c.overlay.soft}
        border="1px solid"
        borderColor={c.border.subtle}
        color={c.text.secondary}
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
        _hover={{ color: c.text.primary, bg: c.overlay.hover }}
        transition="all 0.15s"
        aria-label="Profile menu"
      >
        {primary?.avatar ? (
          <Image src={primary.avatar} alt={primary.displayName} w="100%" h="100%" objectFit="cover" />
        ) : (
          <LuUser size={17} />
        )}
      </Box>

      {open && (
        <>
          <Box position="fixed" inset="0" zIndex={1300} onClick={() => setOpen(false)} />
          <Box
            position="absolute"
            top="46px"
            right="0"
            w="272px"
            zIndex={1301}
            bg={c.surfaceLight}
            border="1px solid"
            borderColor={c.border.subtle}
            borderRadius={c.radius.card}
            boxShadow={c.shadow.panel}
            p="6px"
          >
            <HStack px="10px" py="10px" spacing="11px">
              <Flex
                w="38px"
                h="38px"
                borderRadius="full"
                bg={c.overlay.strong}
                align="center"
                justify="center"
                color={c.text.secondary}
                flexShrink={0}
                overflow="hidden"
              >
                {primary?.avatar ? (
                  <Image src={primary.avatar} alt={primary.displayName} w="100%" h="100%" objectFit="cover" />
                ) : (
                  <LuUser size={18} />
                )}
              </Flex>
              <VStack align="start" spacing="1px" minW={0}>
                <Text fontSize="sm" fontWeight={600} color={c.text.primary} noOfLines={1}>
                  {primary ? primary.displayName : "Guest"}
                </Text>
                <Text fontSize="2xs" color={c.text.muted}>
                  {subtitle}
                </Text>
              </VStack>
            </HStack>

            <Divider borderColor={c.border.subtle} my="4px" />

            <MenuRow icon={<LuUser size={16} />} label="Profile" />
            <MenuRow icon={<LuSettings2 size={16} />} label="Settings" onClick={openSettings} />
            <MenuRow
              icon={<LuMoon size={16} />}
              label="Dark mode"
              right={<CosmeticSwitch on={dark} onToggle={toggleColorMode} />}
            />

            <Divider borderColor={c.border.subtle} my="4px" />

            <Text
              px="10px"
              pt="6px"
              pb="4px"
              fontFamily="mono"
              fontSize="2xs"
              letterSpacing="0.1em"
              color={c.text.subtle}
            >
              LINKED ACCOUNTS
            </Text>
            <AccountRow
              icon={<FaTwitch size={15} />}
              label="Twitch"
              color={c.platform.twitch}
              account={twitch}
              onConnect={() => login("twitch")}
              onDisconnect={() => unlink("twitch")}
            />
            <AccountRow
              icon={<SiKick size={13} />}
              label="Kick"
              color={c.platform.kick}
              account={kick}
              onConnect={() => login("kick")}
              onDisconnect={() => unlink("kick")}
            />

            {signedIn && (
              <>
                <Divider borderColor={c.border.subtle} my="4px" />
                <Box px="6px" py="6px">
                  <Button
                    w="100%"
                    h="38px"
                    borderRadius={c.radius.control}
                    bg={c.overlay.soft}
                    color={c.text.primary}
                    _hover={{ bg: c.overlay.hover }}
                    leftIcon={<LuLogOut size={16} />}
                    fontWeight={600}
                    onClick={logout}
                  >
                    Log out
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </>
      )}

      <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
        <ModalOverlay bg="rgba(0,0,0,0.6)" backdropFilter="blur(4px)" />
        <ModalContent
          bg={c.surface}
          color={c.text.primary}
          border="1px solid"
          borderColor={c.border.subtle}
          borderRadius={c.radius.panel}
          boxShadow={c.shadow.panel}
          mx="16px"
        >
          <ModalHeader fontFamily="heading" fontWeight={400} fontSize="3xl">
            Settings
          </ModalHeader>
          <ModalCloseButton borderRadius={c.radius.control} top="18px" right="16px" />
          <ModalBody pb="24px">
            <SettingsBody />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
